"""
Retrieval: find the most relevant document chunks for a user query.
"""
from typing import List
import faiss
import numpy as np
import pickle
import os
from ai_pipeline.embeddings import get_embedding, INDEX_FILE, META_FILE

TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "5"))


def retrieve_context(query: str) -> List[dict]:
    """Return the top-K most relevant chunks for the given query."""
    if not os.path.exists(INDEX_FILE) or not os.path.exists(META_FILE):
        return []

    index = faiss.read_index(INDEX_FILE)
    with open(META_FILE, "rb") as f:
        metadata = pickle.load(f)

    query_vec = np.array([get_embedding(query)], dtype="float32")
    _, indices = index.search(query_vec, TOP_K)

    results = []
    for idx in indices[0]:
        if idx < len(metadata):
            results.append(metadata[idx])
    return results
