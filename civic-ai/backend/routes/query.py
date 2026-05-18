"""
backend/routes/query.py
────────────────────────
POST /ask  — RAG-powered Q&A endpoint with optional Tavily web-search augmentation

Flow:
  1. DataFetchService embeds the query and retrieves top-k chunks from ChromaDB
  2. (Optional) Augment with Tavily web-search results
  3. summarizer.generate() builds the prompt and calls the NVIDIA NIM LLM
  4. Return { answer, citations, web_sources, sources_used }

Retrieval and LLM generation are fully decoupled:
  - DataFetchService handles all vector-store interaction
  - summarizer.py handles all LLM interaction
  This module orchestrates the two but owns neither.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from rag_pipeline.data_fetch_service import DataFetchError, DataFetchService
from rag_pipeline import summarizer
from backend.auth import require_resident, TokenData
from backend.dependencies import get_data_service

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
    answer: str               # Structured Markdown
    citations: List[Citation]
    web_sources: List[str] = []
    sources_used: int = 0     # number of RAG chunks that contributed to the answer


# ── Tavily web search ─────────────────────────────────────────────────────────


def _tavily_search(query: str, max_results: int = 3) -> list[dict]:
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


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
    current_user: TokenData = Depends(require_resident),
    data_service: DataFetchService = Depends(get_data_service),
):
    """
    Ask a civic question. Returns structured Markdown answer + citations.

    Retrieval is handled by DataFetchService; LLM generation by summarizer.py.
    """
    # 1. Retrieve top-k chunks via DataFetchService (embedding + ChromaDB search)
    try:
        context = data_service.retrieve(body.question, top_k=body.top_k)
    except DataFetchError as exc:
        logger.error("Retrieval failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Retrieval failed: {exc}")

    # 2. Optional Tavily web augmentation
    web_results: list[dict] = []
    web_urls: list[str] = []
    if body.use_web_search:
        web_results = _tavily_search(body.question)
        web_urls = [r.get("url", "") for r in web_results if r.get("url")]

    # 3. Handle empty retrieval
    if not context.chunks:
        _log_question(body.question, current_user.username)
        return AskResponse(
            answer=(
                "## No Information Found\n\n"
                "I don't have enough information in my knowledge base to answer that. "
                "Please contact BBMP directly at **bbmp.gov.in** or call **080-22221188**."
            ),
            citations=[],
            web_sources=web_urls,
            sources_used=0,
        )

    # 4. Generate answer via summarizer (LLM call — no FAISS/ChromaDB here)
    try:
        answer, raw_citations = await summarizer.generate(
            query=body.question,
            context=context,
            web_results=web_results,
        )
    except RuntimeError as exc:
        logger.error("LLM generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    # 5. Build typed Citation objects for the response
    citations = [
        Citation(
            source=c["source"],
            chunk_index=c["chunk_index"],
            text=c["text"],
            score=c["score"],
        )
        for c in raw_citations
    ]

    _log_question(body.question, current_user.username)
    return AskResponse(
        answer=answer,
        citations=citations,
        web_sources=web_urls,
        sources_used=len(context.chunks),
    )


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

