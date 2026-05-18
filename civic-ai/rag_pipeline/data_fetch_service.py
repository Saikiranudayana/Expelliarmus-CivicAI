"""
rag_pipeline/data_fetch_service.py
────────────────────────────────────
Encapsulates all ChromaDB retrieval logic behind a clean, typed interface.

Note: This project uses ChromaDB (not FAISS) as its vector store.
The DataFetchService wraps ChromaDB queries so that query.py and summarizer.py
never touch the vector store directly — enabling independent testing and
future backend swaps with zero changes to the route layer.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ── Value objects ─────────────────────────────────────────────────────────────


@dataclass
class RetrievedChunk:
    """A single retrieved document chunk with its metadata."""

    chunk_id: str
    text: str
    source_document: str       # filename / document title stored in ChromaDB metadata
    page_number: Optional[int]  # None when not available in metadata
    score: float               # cosine similarity in [-1, 1]; higher is better
    fetched_at: float = field(default_factory=time.time)


@dataclass
class RetrievedContext:
    """The complete retrieval result for one user query."""

    query: str
    chunks: list[RetrievedChunk]
    total_chunks_searched: int   # total docs in collection at query time
    retrieval_time_ms: float

    @property
    def context_text(self) -> str:
        """
        Returns all chunk texts joined for injection into an LLM prompt.
        Format: numbered list with source attribution.
        """
        lines: list[str] = []
        for i, chunk in enumerate(self.chunks, 1):
            if chunk.page_number is not None:
                source = f"{chunk.source_document}, p.{chunk.page_number}"
            else:
                source = chunk.source_document
            lines.append(f"[{i}] ({source})\n{chunk.text}")
        return "\n\n".join(lines)


# ── Exceptions ────────────────────────────────────────────────────────────────


class DataFetchError(Exception):
    """Raised when ChromaDB retrieval or embedding fails."""


# ── Service ───────────────────────────────────────────────────────────────────


class DataFetchService:
    """
    Encapsulates all ChromaDB retrieval logic.

    Designed to be instantiated once at app startup via FastAPI dependency
    injection (see backend/dependencies.py) and reused across requests.

    The optional *_collection* parameter is provided for unit tests so that
    tests can inject an in-memory ChromaDB collection without touching disk.
    """

    def __init__(
        self,
        chroma_path: str,
        collection_name: str,
        _collection: Any | None = None,  # internal: test injection only
    ) -> None:
        """
        Connect to (or reuse) a ChromaDB persistent store.

        Parameters
        ----------
        chroma_path:
            Filesystem path where ChromaDB persists its data.
        collection_name:
            Name of the ChromaDB collection to query.
        _collection:
            Pre-built collection object — used in tests to skip disk I/O.

        Raises
        ------
        DataFetchError
            If the ChromaDB client or collection cannot be initialised.
        """
        if _collection is not None:
            # Test path: skip real disk connection
            self._collection: Any = _collection
            self._ready = True
            logger.debug("DataFetchService: initialised with injected collection.")
            return

        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            self._client = chromadb.PersistentClient(
                path=chroma_path,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            self._ready = True
            logger.info(
                "DataFetchService: connected to ChromaDB — collection=%s, docs=%d",
                collection_name,
                self._collection.count(),
            )
        except Exception as exc:
            self._ready = False
            raise DataFetchError(f"Failed to initialise ChromaDB: {exc}") from exc

    # ── Public interface ──────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> RetrievedContext:
        """
        Embed the query via NVIDIA NV-EmbedQA-E5 and search ChromaDB.

        Returns a RetrievedContext with up to *top_k* chunks whose cosine
        similarity score is >= *min_score*.

        Raises
        ------
        DataFetchError
            On embedding failure or ChromaDB query failure.
        """
        if not self._ready:
            raise DataFetchError("DataFetchService is not ready — ChromaDB not connected.")

        t0 = time.perf_counter()

        # Step 1: Embed the query (reuses the existing embeddings module)
        try:
            from rag_pipeline.embeddings import generate_query_embedding

            query_vector: list[float] = generate_query_embedding(query)
        except Exception as exc:
            raise DataFetchError(f"Query embedding failed: {exc}") from exc

        # Step 2: Determine how many docs we can actually retrieve
        try:
            total_in_collection: int = self._collection.count()
        except Exception as exc:
            raise DataFetchError(f"ChromaDB count failed: {exc}") from exc

        if total_in_collection == 0:
            elapsed = (time.perf_counter() - t0) * 1000
            return RetrievedContext(
                query=query,
                chunks=[],
                total_chunks_searched=0,
                retrieval_time_ms=elapsed,
            )

        n_results = min(top_k, total_in_collection)

        # Step 3: Query ChromaDB
        try:
            results = self._collection.query(
                query_embeddings=[query_vector],
                n_results=n_results,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            raise DataFetchError(f"ChromaDB query failed: {exc}") from exc

        elapsed_ms = (time.perf_counter() - t0) * 1000

        # Step 4: Map results → RetrievedChunk, apply min_score filter
        chunks: list[RetrievedChunk] = []
        for doc_id, doc, meta, dist in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            score = 1.0 - dist  # cosine distance → cosine similarity
            if score < min_score:
                continue

            page_raw = meta.get("page_number") or meta.get("page")
            page_number: Optional[int] = int(page_raw) if page_raw is not None else None

            chunks.append(
                RetrievedChunk(
                    chunk_id=doc_id,
                    text=doc,
                    source_document=meta.get("source", "unknown"),
                    page_number=page_number,
                    score=score,
                )
            )

        logger.debug(
            "DataFetchService.retrieve: query=%r, returned=%d/%d chunks in %.1fms",
            query[:60],
            len(chunks),
            total_in_collection,
            elapsed_ms,
        )

        return RetrievedContext(
            query=query,
            chunks=chunks,
            total_chunks_searched=total_in_collection,
            retrieval_time_ms=elapsed_ms,
        )

    def is_ready(self) -> bool:
        """Returns True if the ChromaDB collection is loaded and ready."""
        return self._ready

    def collection_count(self) -> int:
        """Returns the total number of indexed chunks, or 0 if not ready."""
        if not self._ready:
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0
