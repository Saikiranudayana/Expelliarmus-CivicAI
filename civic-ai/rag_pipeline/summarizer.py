"""
rag_pipeline/summarizer.py
───────────────────────────
LLM answer generation for CIVIC AI.

This module is the *only* place that calls the NVIDIA NIM LLM.
It receives a pre-fetched RetrievedContext and optional web results,
builds a grounded prompt, and returns the answer + citation list.

It deliberately does NOT import or reference ChromaDB / FAISS.
"""

from __future__ import annotations

import logging
from typing import Optional

from openai import OpenAI

from rag_pipeline.data_fetch_service import RetrievedChunk, RetrievedContext

logger = logging.getLogger(__name__)


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


# ── Prompt building ───────────────────────────────────────────────────────────


def _build_prompt(
    question: str,
    context: RetrievedContext,
    web_results: list[dict],
) -> str:
    """
    Compose the user-turn prompt from a RetrievedContext and optional web results.

    The context.context_text property produces a numbered, source-attributed
    block ready for injection.
    """
    rag_context = context.context_text or "(no matching documents found)"

    web_context = ""
    if web_results:
        web_parts: list[str] = []
        for r in web_results:
            title = r.get("title", "Web Result")
            url = r.get("url", "")
            content = str(r.get("content", ""))[:500]
            web_parts.append(f"[Web] {title}\nURL: {url}\n{content}")
        web_context = (
            "\n\nAdditional live web search results:\n\n"
            + "\n\n---\n\n".join(web_parts)
        )

    return (
        f"Context from BBMP / Karnataka civic documents:\n\n"
        f"{rag_context}"
        f"{web_context}\n\n"
        f"---\n\n"
        f"Question: {question}\n\n"
        f"Respond in the structured Markdown format described in the system prompt:"
    )


# ── Citation builder ──────────────────────────────────────────────────────────


def _build_citations(chunks: list[RetrievedChunk]) -> list[dict]:
    """Convert RetrievedChunk objects to the citation dicts expected by AskResponse."""
    def _chunk_index(chunk_id: str | None) -> int:
        if not chunk_id:
            return -1
        try:
            return int(chunk_id.split("-")[0])
        except (ValueError, IndexError):
            return -1

    return [
        {
            "source": chunk.source_document,
            "chunk_index": _chunk_index(chunk.chunk_id),
            "text": chunk.text,
            "score": chunk.score,
        }
        for chunk in chunks
    ]


# ── Public interface ──────────────────────────────────────────────────────────


async def generate(
    query: str,
    context: RetrievedContext,
    web_results: Optional[list[dict]] = None,
) -> tuple[str, list[dict]]:
    """
    Build an LLM prompt from *context* and call NVIDIA Nemotron via the
    OpenAI-compatible client.

    Parameters
    ----------
    query:
        The original user question.
    context:
        Pre-fetched RetrievedContext from DataFetchService. This module
        does NOT perform any vector store queries itself.
    web_results:
        Optional list of Tavily search result dicts for web augmentation.

    Returns
    -------
    tuple[str, list[dict]]
        (answer_markdown, citations) where citations are dicts matching
        the Citation Pydantic schema in query.py.

    Raises
    ------
    RuntimeError
        If the NVIDIA NIM LLM call fails.
    """
    _web: list[dict] = web_results or []

    # Lazy import to avoid circular dependencies during module loading
    _settings = None

    def _get_settings():
        nonlocal _settings
        if _settings is None:
            from config import settings as s
            _settings = s
        return _settings

    cfg = _get_settings()

    client = OpenAI(
        base_url=cfg.NVIDIA_NIM_BASE_URL,
        api_key=cfg.NVIDIA_API_KEY,
    )

    prompt = _build_prompt(query, context, _web)

    try:
        response = client.chat.completions.create(
            model=cfg.NVIDIA_LLM_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
            temperature=0.2,
        )
        answer: str = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        raise RuntimeError(f"LLM service error: {exc}") from exc

    citations = _build_citations(context.chunks)
    return answer, citations
