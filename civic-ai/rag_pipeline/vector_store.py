"""
rag_pipeline/vector_store.py
────────────────────────────
ChromaDB-backed vector store — pure Python, file-based, no Docker needed.

Data is persisted to the directory set by CHROMA_PATH (default: ./chroma_db).
"""

from typing import List, Dict, Any, Optional
import logging
import uuid

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)

# Singleton client — initialised once via connect_vector_store()
_client: Optional[chromadb.ClientAPI] = None


# ── Connection ────────────────────────────────────────────────────────────────

def connect_vector_store(path: str) -> chromadb.ClientAPI:
    """
    Open (or reuse) a ChromaDB persistent client stored at *path*.

    Parameters
    ----------
    path : str
        Local directory where ChromaDB persists its data, e.g. ``./chroma_db``.
    """
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client connected — path=%s", path)
    return _client


def _get_client() -> chromadb.ClientAPI:
    if _client is None:
        raise RuntimeError(
            "ChromaDB client not initialised. Call connect_vector_store() first."
        )
    return _client


# ── Collection management ─────────────────────────────────────────────────────

def get_or_create_collection(collection_name: str) -> Any:
    """
    Return the named ChromaDB collection, creating it if it does not exist.
    Uses cosine distance (equivalent to cosine similarity ranking).
    """
    client = _get_client()
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(
        "Collection '%s' ready — %d document(s) already indexed.",
        collection_name,
        collection.count(),
    )
    return collection


# ── Insert ────────────────────────────────────────────────────────────────────

def insert_chunks(
    collection: Any,
    chunks: List[Dict],
    embeddings: List[List[float]],
) -> None:
    """Insert *chunks* + *embeddings* into *collection*."""
    if len(chunks) != len(embeddings):
        raise ValueError(
            f"Chunk count ({len(chunks)}) != embedding count ({len(embeddings)})."
        )

    ids        = [str(uuid.uuid4()) for _ in chunks]
    documents  = [c["text"]         for c in chunks]
    metadatas  = [
        {"source": c["source"], "chunk_index": c["chunk_index"]}
        for c in chunks
    ]

    # ChromaDB accepts batches; split into ≤ 5 000 per call to stay safe
    batch_size = 5_000
    for start in range(0, len(ids), batch_size):
        sl = slice(start, start + batch_size)
        collection.add(
            ids=ids[sl],
            documents=documents[sl],
            embeddings=embeddings[sl],
            metadatas=metadatas[sl],
        )

    logger.info("Inserted %d chunks into '%s'.", len(ids), collection.name)


# ── Search ────────────────────────────────────────────────────────────────────

def search_chunks(
    collection: Any,
    query_vector: List[float],
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Return the *top_k* most similar chunks for *query_vector*.

    Each result dict has keys: id, source, chunk_index, text, score.
    Score is a cosine distance [0, 2]; lower = more similar.
    """
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    hits: List[Dict[str, Any]] = []
    for doc_id, doc, meta, dist in zip(
        results["ids"][0],
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append(
            {
                "id":          doc_id,
                "source":      meta.get("source", ""),
                "chunk_index": meta.get("chunk_index", -1),
                "text":        doc,
                "score":       1 - dist,   # convert distance → similarity [−1, 1]
            }
        )
    return hits


# ── Helpers ───────────────────────────────────────────────────────────────────

def collection_stats(collection: Any) -> Dict[str, Any]:
    """Return document count for *collection*."""
    return {"collection": collection.name, "row_count": collection.count()}

