"""
Semantic chunking with overlap.
"""
from typing import List
from backend.config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(text: str, source: str = "") -> List[dict]:
    """
    Split text into overlapping chunks.
    Returns list of dicts with 'text', 'source', and 'chunk_index'.
    """
    words = text.split()
    chunks = []
    start = 0
    idx = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunk_words = words[start:end]
        chunks.append({
            "text": " ".join(chunk_words),
            "source": source,
            "chunk_index": idx,
        })
        start += CHUNK_SIZE - CHUNK_OVERLAP
        idx += 1
    return chunks
