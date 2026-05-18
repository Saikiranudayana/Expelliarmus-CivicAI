"""
backend/dependencies.py
────────────────────────
FastAPI dependency providers for CIVIC AI.

DataFetchService is a singleton: instantiated once on first use and reused
across all subsequent requests (via functools.lru_cache).

Usage in a route:
    from backend.dependencies import get_data_service
    from rag_pipeline.data_fetch_service import DataFetchService

    @router.post("/ask")
    async def ask(
        body: AskRequest,
        data_service: DataFetchService = Depends(get_data_service),
    ): ...
"""

from __future__ import annotations

import logging
from functools import lru_cache

from rag_pipeline.data_fetch_service import DataFetchService, DataFetchError

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_data_service() -> DataFetchService:
    """
    Singleton factory for DataFetchService.

    Reads CHROMA_PATH and CHROMA_COLLECTION from config/env (the same settings
    already used by the main lifespan in main.py). The service creates its own
    ChromaDB PersistentClient — ChromaDB supports concurrent connections to the
    same store.

    Raises DataFetchError on first call if ChromaDB cannot be opened.
    """
    # Lazy import to avoid loading config at module import time
    from config import settings

    logger.info(
        "Initialising DataFetchService — chroma_path=%s, collection=%s",
        settings.CHROMA_PATH,
        settings.CHROMA_COLLECTION,
    )
    return DataFetchService(
        chroma_path=settings.CHROMA_PATH,
        collection_name=settings.CHROMA_COLLECTION,
    )
