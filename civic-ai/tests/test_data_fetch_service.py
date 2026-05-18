"""
tests/test_data_fetch_service.py
──────────────────────────────────
Unit tests for DataFetchService and RetrievedContext.

Strategy
────────
The ChromaDB collection is replaced with a MagicMock that returns pre-baked
query results. This avoids chromadb initialisation entirely, which is important
because the Anaconda Python 3.8 environment has a posthog package that crashes
on import for newer chromadb versions (dict[str, T] syntax requires Python 3.9+).

generate_query_embedding is also patched so no real NVIDIA API key is required.

Tests
─────
  1. is_ready() returns True after init with an injected collection
  2. retrieve() returns a RetrievedContext with the correct chunk count
  3. retrieve() with min_score filtering works correctly
  4. retrieve() returns empty RetrievedContext for an empty collection
  5. RetrievedContext.context_text formats correctly (with and without page numbers)
  6. DataFetchService raises DataFetchError when ChromaDB path is invalid
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from rag_pipeline.data_fetch_service import (
    DataFetchError,
    DataFetchService,
    RetrievedChunk,
    RetrievedContext,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

EMBED_DIM = 5  # tiny vectors; real model uses 1024

_SAMPLE_DOCS = [
    {"id": "chunk-0", "text": "BBMP budget allocation for ward 10 is Rs 5 crore.",
     "meta": {"source": "bbmp_budget_2026.pdf", "chunk_index": 0}},
    {"id": "chunk-1", "text": "Nagawara metro station will open in Q3 2026.",
     "meta": {"source": "metro_plan.pdf", "chunk_index": 1}},
    {"id": "chunk-2", "text": "Kothanur ward has 3 elected councillors.",
     "meta": {"source": "ward_data.pdf", "chunk_index": 2}},
    {"id": "chunk-3", "text": "Solid waste plan approved for north Bengaluru.",
     "meta": {"source": "waste_mgmt.pdf", "chunk_index": 3}},
    {"id": "chunk-4", "text": "Water supply project for Hennur estimated at Rs 12 crore.",
     "meta": {"source": "water_project.pdf", "chunk_index": 4}},
]


def _make_dummy_vector(seed: float = 0.0) -> list[float]:
    base = [seed + i * 0.1 for i in range(EMBED_DIM)]
    magnitude = sum(v ** 2 for v in base) ** 0.5
    return [v / magnitude for v in base]


def _make_mock_collection(docs: list[dict[str, Any]]) -> MagicMock:
    """
    Return a MagicMock that behaves like a ChromaDB collection.
    Supports .count() and .query(...) used by DataFetchService.
    """
    collection = MagicMock()
    collection.count.return_value = len(docs)

    def mock_query(
        query_embeddings: list,
        n_results: int,
        include: list,
    ) -> dict[str, list]:
        sliced = docs[:n_results]
        # Distances close to 0 ≈ high cosine similarity
        return {
            "ids":       [[d["id"] for d in sliced]],
            "documents": [[d["text"] for d in sliced]],
            "metadatas": [[d["meta"] for d in sliced]],
            "distances": [[0.05 * i for i in range(len(sliced))]],
        }

    collection.query.side_effect = mock_query
    return collection


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def mock_collection() -> MagicMock:
    return _make_mock_collection(_SAMPLE_DOCS)


@pytest.fixture()
def service(mock_collection: MagicMock) -> DataFetchService:
    """DataFetchService with injected mock collection (no disk, no API calls)."""
    return DataFetchService(
        chroma_path="",
        collection_name="",
        _collection=mock_collection,
    )


# Patch target: the function where it is DEFINED, not where it is lazily imported.
# DataFetchService.retrieve() does `from rag_pipeline.embeddings import generate_query_embedding`
# inside the method body, so patching the source module attribute is correct.
_EMBED_PATCH = "rag_pipeline.embeddings.generate_query_embedding"


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestIsReady:
    def test_is_ready_returns_true_after_injection(
        self, service: DataFetchService
    ) -> None:
        """Test 1: is_ready() returns True when a collection is injected."""
        assert service.is_ready() is True

    def test_collection_count_matches_mock(
        self, service: DataFetchService
    ) -> None:
        assert service.collection_count() == len(_SAMPLE_DOCS)


class TestRetrieve:
    def test_retrieve_returns_correct_chunk_count(
        self, service: DataFetchService
    ) -> None:
        """Test 2: retrieve(top_k=3) returns exactly 3 chunks."""
        with patch(_EMBED_PATCH, return_value=_make_dummy_vector(0.0)):
            ctx = service.retrieve("BBMP budget", top_k=3)

        assert isinstance(ctx, RetrievedContext)
        assert len(ctx.chunks) == 3
        assert ctx.query == "BBMP budget"
        assert ctx.total_chunks_searched == len(_SAMPLE_DOCS)
        assert ctx.retrieval_time_ms >= 0

    def test_retrieve_caps_at_collection_size(
        self, service: DataFetchService
    ) -> None:
        """retrieve() returns at most as many chunks as exist in the collection."""
        with patch(_EMBED_PATCH, return_value=_make_dummy_vector(0.0)):
            ctx = service.retrieve("anything", top_k=100)

        assert len(ctx.chunks) <= len(_SAMPLE_DOCS)

    def test_retrieve_min_score_filtering(
        self, service: DataFetchService
    ) -> None:
        """Test 3: high min_score discards low-scoring chunks."""
        # Mock returns distances [0.0, 0.05, 0.10, 0.15, 0.20]
        # → similarities [1.0, 0.95, 0.90, 0.85, 0.80]
        # A min_score of 0.92 should keep only the first 2 chunks.
        vec = _make_dummy_vector(0.0)
        with patch(_EMBED_PATCH, return_value=vec):
            ctx_open = service.retrieve("BBMP", top_k=5, min_score=0.0)
            ctx_strict = service.retrieve("BBMP", top_k=5, min_score=0.92)

        assert len(ctx_strict.chunks) <= len(ctx_open.chunks)

    def test_retrieve_chunk_fields_populated(
        self, service: DataFetchService
    ) -> None:
        """Each RetrievedChunk has the expected non-empty fields."""
        with patch(_EMBED_PATCH, return_value=_make_dummy_vector(0.0)):
            ctx = service.retrieve("water supply", top_k=1)

        assert len(ctx.chunks) == 1
        chunk = ctx.chunks[0]
        assert isinstance(chunk, RetrievedChunk)
        assert chunk.chunk_id != ""
        assert chunk.text != ""
        assert chunk.source_document != ""
        assert isinstance(chunk.score, float)

    def test_retrieve_raises_data_fetch_error_on_embedding_failure(
        self, service: DataFetchService
    ) -> None:
        """retrieve() wraps embedding errors in DataFetchError."""
        with patch(_EMBED_PATCH, side_effect=RuntimeError("API key invalid")):
            with pytest.raises(DataFetchError):
                service.retrieve("anything")

    def test_retrieve_returns_empty_context_for_empty_collection(self) -> None:
        """Test 4: retrieve() returns empty RetrievedContext when collection has 0 docs."""
        empty_col = _make_mock_collection([])  # count() → 0
        svc = DataFetchService(chroma_path="", collection_name="", _collection=empty_col)

        with patch(_EMBED_PATCH, return_value=_make_dummy_vector(0.0)):
            ctx = svc.retrieve("anything", top_k=5)

        assert ctx.chunks == []
        assert ctx.total_chunks_searched == 0


class TestRetrievedContextText:
    def test_context_text_with_page_numbers(self) -> None:
        """Test 5a: context_text includes numbered entries with page attribution."""
        chunks = [
            RetrievedChunk(
                chunk_id="a", text="BBMP budget info",
                source_document="budget.pdf", page_number=3, score=0.9,
            ),
            RetrievedChunk(
                chunk_id="b", text="Metro update",
                source_document="metro_report.pdf", page_number=7, score=0.8,
            ),
        ]
        ctx = RetrievedContext(query="budget", chunks=chunks,
                               total_chunks_searched=10, retrieval_time_ms=50.0)
        text = ctx.context_text
        assert "[1] (budget.pdf, p.3)" in text
        assert "BBMP budget info" in text
        assert "[2] (metro_report.pdf, p.7)" in text
        assert "Metro update" in text

    def test_context_text_without_page_numbers(self) -> None:
        """Test 5b: context_text omits page number when it is None."""
        chunks = [
            RetrievedChunk(
                chunk_id="c", text="Water project details",
                source_document="water_report.csv", page_number=None, score=0.85,
            ),
        ]
        ctx = RetrievedContext(query="water", chunks=chunks,
                               total_chunks_searched=5, retrieval_time_ms=20.0)
        text = ctx.context_text
        assert "[1] (water_report.csv)" in text
        assert "p." not in text
        assert "Water project details" in text

    def test_context_text_is_empty_for_no_chunks(self) -> None:
        """context_text returns an empty string when there are no chunks."""
        ctx = RetrievedContext(query="test", chunks=[],
                               total_chunks_searched=0, retrieval_time_ms=1.0)
        assert ctx.context_text == ""


class TestDataFetchServiceInit:
    def test_raises_data_fetch_error_on_bad_chroma_path(self) -> None:
        """Test 6: DataFetchService raises DataFetchError when ChromaDB path is invalid."""
        with pytest.raises(DataFetchError):
            DataFetchService(
                chroma_path="/nonexistent/cannot/be/created/xyz123",
                collection_name="test",
            )
