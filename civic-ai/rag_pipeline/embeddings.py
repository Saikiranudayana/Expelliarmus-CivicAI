from typing import List
import logging

from openai import OpenAI

# Imported lazily to avoid circular imports when this module is used standalone
_settings = None


def _get_settings():
    global _settings
    if _settings is None:
        from config import settings as _s
        _settings = _s
    return _settings


logger = logging.getLogger(__name__)

# Dimension of nvidia/nv-embedqa-e5-v5 output vectors
EMBEDDING_DIM = 1024


def get_embedding_client() -> OpenAI:
    """Return an OpenAI client pointed at the NVIDIA NIM embeddings endpoint."""
    cfg = _get_settings()
    return OpenAI(
        base_url=cfg.NVIDIA_NIM_BASE_URL,
        api_key=cfg.NVIDIA_API_KEY,
    )


def generate_embeddings(
    texts: List[str],
    batch_size: int = 64,
) -> List[List[float]]:
    """
    Generate embeddings for *texts* using NVIDIA NeMo Retriever via NIM API.

    Sends requests in batches of *batch_size* to stay within API payload limits.
    The `input_type="passage"` setting is required by the NV-EmbedQA model family
    when indexing document chunks; use `input_type="query"` at retrieval time.

    Returns a list of float vectors with length EMBEDDING_DIM (1024).
    """
    cfg = _get_settings()
    client = get_embedding_client()
    all_embeddings: List[List[float]] = []

    for batch_start in range(0, len(texts), batch_size):
        batch = texts[batch_start : batch_start + batch_size]
        logger.debug(
            "Embedding batch %d/%d (%d texts).",
            batch_start // batch_size + 1,
            (len(texts) + batch_size - 1) // batch_size,
            len(batch),
        )
        response = client.embeddings.create(
            input=batch,
            model=cfg.NVIDIA_EMBEDDING_MODEL,
            encoding_format="float",
            extra_body={"input_type": "passage", "truncate": "END"},
        )
        all_embeddings.extend(item.embedding for item in response.data)

    return all_embeddings


def generate_query_embedding(query: str) -> List[float]:
    """
    Generate a single embedding for a user *query*.

    Uses `input_type="query"` as required by the NV-EmbedQA model for retrieval.
    """
    cfg = _get_settings()
    client = get_embedding_client()
    response = client.embeddings.create(
        input=[query],
        model=cfg.NVIDIA_EMBEDDING_MODEL,
        encoding_format="float",
        extra_body={"input_type": "query", "truncate": "END"},
    )
    return response.data[0].embedding
