"""
Embedding generation and vector store persistence using FAISS.
"""
from typing import List
import faiss
import numpy as np
import pickle
import os
from openai import OpenAI
from backend.config import NVIDIA_API_KEY, NVIDIA_BASE_URL, VECTOR_STORE_PATH

_client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)

INDEX_FILE = os.path.join(VECTOR_STORE_PATH, "index.faiss")
META_FILE = os.path.join(VECTOR_STORE_PATH, "metadata.pkl")

EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5"
EMBEDDING_DIM = 1024


def _load_store():
    if os.path.exists(INDEX_FILE) and os.path.exists(META_FILE):
        index = faiss.read_index(INDEX_FILE)
        with open(META_FILE, "rb") as f:
            metadata = pickle.load(f)
    else:
        index = faiss.IndexFlatL2(EMBEDDING_DIM)
        metadata = []
    return index, metadata


def _save_store(index, metadata):
    os.makedirs(VECTOR_STORE_PATH, exist_ok=True)
    faiss.write_index(index, INDEX_FILE)
    with open(META_FILE, "wb") as f:
        pickle.dump(metadata, f)


def get_embedding(text: str) -> List[float]:
    response = _client.embeddings.create(input=[text], model=EMBEDDING_MODEL)
    return response.data[0].embedding


def embed_and_store(chunks: List[dict]):
    index, metadata = _load_store()
    vectors = []
    for chunk in chunks:
        emb = get_embedding(chunk["text"])
        vectors.append(emb)
        metadata.append(chunk)
    index.add(np.array(vectors, dtype="float32"))
    _save_store(index, metadata)
