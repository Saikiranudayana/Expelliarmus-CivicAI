"""
backend/routes/query.py
────────────────────────
POST /ask  — RAG-powered Q&A endpoint with optional Tavily web-search augmentation

Flow:
  1. Embed the user question via NVIDIA NeMo Retriever (input_type="query")
  2. Retrieve top-5 chunks from ChromaDB
  3. (Optional) Augment with Tavily web-search results
  4. Build a grounded prompt and call LLM via NVIDIA NIM
  5. Return { answer, citations, web_sources } — answer is structured Markdown
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

import httpx
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

from config import settings
from rag_pipeline.embeddings import generate_query_embedding
from rag_pipeline.vector_store import search_chunks
from backend.auth import require_resident, TokenData

logger = logging.getLogger(__name__)
router = APIRouter(tags=["query"])

_QUESTIONS_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "recent_questions.json"

def _log_question(question: str, username: str) -> None:
    """Append question to recent_questions.json, keeping last 50."""
    try:
        _QUESTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        existing = json.loads(_QUESTIONS_FILE.read_text()) if _QUESTIONS_FILE.exists() else []
        existing.insert(0, {
            "question": question,
            "asked_by": username,
            "asked_at": datetime.utcnow().isoformat(),
        })
        _QUESTIONS_FILE.write_text(json.dumps(existing[:50], indent=2))
    except Exception as exc:
        logger.warning("Could not log question: %s", exc)

# ── Request / Response schemas ────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000,
                          description="The civic question to answer")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve")
    use_web_search: bool = Field(True, description="Augment with Tavily web search")


class Citation(BaseModel):
    source: str
    chunk_index: int
    text: str
    score: float


class AskResponse(BaseModel):
    answer: str          # Structured Markdown
    citations: List[Citation]
    web_sources: List[str] = []


# ── LLM client (NVIDIA NIM — OpenAI-compatible) ───────────────────────────────

def _llm_client() -> OpenAI:
    return OpenAI(
        base_url=settings.NVIDIA_NIM_BASE_URL,
        api_key=settings.NVIDIA_API_KEY,
    )


# ── Tavily web search ─────────────────────────────────────────────────────────

def _tavily_search(query: str, max_results: int = 3) -> list:
    """Call Tavily Search API and return top result objects."""
    if not settings.TAVILY_API_KEY or settings.TAVILY_API_KEY.startswith("tvly-your"):
        return []
    try:
        resp = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.TAVILY_API_KEY,
                "query": f"Bengaluru BBMP {query}",
                "max_results": max_results,
                "search_depth": "basic",
                "include_answer": False,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json().get("results", [])
    except Exception as exc:
        logger.warning("Tavily search failed (non-fatal): %s", exc)
        return []


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are CIVIC AI, an expert assistant for the city of Bengaluru.
You help residents and community organisers understand civic data, BBMP budgets,
ward committee decisions, and local government policies.

CRITICAL FORMATTING RULES — always respond in this exact Markdown structure:

## Summary
2-3 sentence plain-language overview of the answer.

## Key Details
- Use bullet points for each key fact
- **Bold** important numbers, names, and amounts
- Reference source documents inline

## What This Means for Residents
1-2 sentences explaining the practical impact.

## Sources
- List document names / URLs used

Additional rules:
- Answer ONLY from the provided context and web results.
- If insufficient data exists, state: "I don't have enough information in my knowledge base. Please contact BBMP directly."
- Be concise, factual, and use plain language.
- Never fabricate data or numbers.
"""


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(question: str, chunks: list, web_results: list) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[{i}] Source: {chunk['source']} (chunk {chunk['chunk_index']})\n"
            f"{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    web_context = ""
    if web_results:
        web_parts = []
        for r in web_results:
            title = r.get("title", "Web Result")
            url = r.get("url", "")
            content = r.get("content", "")[:500]
            web_parts.append(f"[Web] {title}\nURL: {url}\n{content}")
        web_context = (
            "\n\nAdditional live web search results:\n\n"
            + "\n\n---\n\n".join(web_parts)
        )

    return (
        f"Context from BBMP / Karnataka civic documents:\n\n"
        f"{context}"
        f"{web_context}\n\n"
        f"---\n\n"
        f"Question: {question}\n\n"
        f"Respond in the structured Markdown format described in the system prompt:"
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
    request: Request,
    current_user: TokenData = Depends(require_resident),
):
    """
    Ask a civic question. Returns structured Markdown answer + citations.
    """
    collection = request.app.state.collection

    # 1. Embed the question
    try:
        query_vector = generate_query_embedding(body.question)
    except Exception as exc:
        logger.error("Embedding failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Embedding service error: {exc}")

    # 2. Retrieve top-k chunks
    try:
        chunks = search_chunks(collection, query_vector, top_k=body.top_k)
    except Exception as exc:
        logger.error("Vector search failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Vector store error: {exc}")

    # 3. Optional Tavily web augmentation
    web_results: list = []
    web_urls: list[str] = []
    if body.use_web_search:
        web_results = _tavily_search(body.question)
        web_urls = [r.get("url", "") for r in web_results if r.get("url")]

    if not chunks:
        return AskResponse(
            answer=(
                "## No Information Found\n\n"
                "I don't have enough information in my knowledge base to answer that. "
                "Please contact BBMP directly at **bbmp.gov.in** or call **080-22221188**."
            ),
            citations=[],
            web_sources=web_urls,
        )

    # 4. Build prompt and call LLM
    prompt = _build_prompt(body.question, chunks, web_results)
    client = _llm_client()
    try:
        response = client.chat.completions.create(
            model=settings.NVIDIA_LLM_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"LLM service error: {exc}")

    # 5. Build citations
    citations = [
        Citation(
            source=c["source"],
            chunk_index=c["chunk_index"],
            text=c["text"],
            score=c["score"],
        )
        for c in chunks
    ]

    _log_question(body.question, current_user.username)
    return AskResponse(answer=answer, citations=citations, web_sources=web_urls)


@router.get("/ask/recent", tags=["query"])
async def recent_questions(_: TokenData = Depends(require_resident)):
    """Return the 5 most recent questions asked across all users."""
    try:
        if not _QUESTIONS_FILE.exists():
            return {"questions": []}
        data = json.loads(_QUESTIONS_FILE.read_text())
        return {"questions": data[:5]}
    except Exception:
        return {"questions": []}

