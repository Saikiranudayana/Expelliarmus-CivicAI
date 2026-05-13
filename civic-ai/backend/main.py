"""
civic-ai/backend/main.py
─────────────────────────
FastAPI application entry-point.

Endpoints
---------
POST /ask          — ask a question, get a grounded answer + citations
POST /ingest/file  — organizer uploads a PDF/CSV/XLSX
GET  /ingest/stats — indexed document count
GET  /health       — liveness probe
"""

import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

# Allow running as: python -m backend.main OR uvicorn backend.main:app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from rag_pipeline.vector_store import connect_vector_store, get_or_create_collection
from backend.routes.auth import router as auth_router
from backend.routes.query import router as query_router
from backend.routes.ingest import router as ingest_router
from backend.routes.meetings import router as meetings_router
from backend.routes.subscribers import router as subscribers_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── App lifespan (startup / shutdown) ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect ChromaDB
    logger.info("Starting CIVIC AI backend …")
    connect_vector_store(settings.CHROMA_PATH)
    collection = get_or_create_collection(settings.CHROMA_COLLECTION)
    app.state.collection = collection
    logger.info("ChromaDB ready — %d chunks indexed.", collection.count())
    yield
    # Shutdown
    logger.info("CIVIC AI backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CIVIC AI",
    description="Community Information & Engagement Platform powered by NVIDIA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(query_router)
app.include_router(ingest_router)
app.include_router(meetings_router)
app.include_router(subscribers_router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "civic-ai"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
