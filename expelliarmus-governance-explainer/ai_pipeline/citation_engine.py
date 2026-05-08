"""
Citation engine: maps retrieved chunks back to human-readable source references.
"""
from typing import List


def build_citations(chunks: List[dict]) -> List[str]:
    """
    Build a deduplicated list of citation strings from retrieved chunks.
    Format: "Document: <source>, Section chunk <chunk_index>"
    """
    seen = set()
    citations = []
    for chunk in chunks:
        key = (chunk["source"], chunk["chunk_index"])
        if key not in seen:
            seen.add(key)
            citations.append(
                f"Document: {chunk['source']}, Section chunk {chunk['chunk_index']}"
            )
    return citations
