"""
backend/routes/ingest.py
─────────────────────────
POST /ingest/file        — organizer uploads a PDF, CSV, or XLSX for indexing
POST /ingest/notify      — send document summary to WhatsApp subscribers
GET  /ingest/stats       — how many chunks are currently indexed
"""

import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from pydantic import BaseModel

from config import settings
from rag_pipeline.pdf_loader import load_pdfs
from rag_pipeline.chunker import chunk_text
from rag_pipeline.embeddings import generate_embeddings
from rag_pipeline.vector_store import insert_chunks
from backend.auth import require_organizer, TokenData
from services.whatsapp_notifier import load_subscribers, send_text_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])

_ALLOWED_EXTENSIONS = {".pdf", ".csv", ".xlsx", ".xls"}


class IngestResponse(BaseModel):
    filename: str
    chunks_added: int
    total_indexed: int


class StatsResponse(BaseModel):
    collection: str
    total_indexed: int


class NotifyRequest(BaseModel):
    filename: str
    chunks_added: int
    summary: str = ""


class NotifyResponse(BaseModel):
    sent_to: int
    message: str


@router.get("/stats", response_model=StatsResponse)
async def stats(request: Request):
    """Return the current number of indexed chunks."""
    collection = request.app.state.collection
    return StatsResponse(
        collection=settings.CHROMA_COLLECTION,
        total_indexed=collection.count(),
    )


@router.post("/file", response_model=IngestResponse)
async def ingest_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_organizer),
):
    """
    Upload a PDF / CSV / XLSX and ingest it into the vector store.
    Only organisers should call this endpoint (JWT-protected).
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}",
        )

    collection = request.app.state.collection

    with tempfile.TemporaryDirectory() as tmp_dir:
        dest = Path(tmp_dir) / file.filename
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        docs = load_pdfs(tmp_dir)

    if not docs:
        raise HTTPException(status_code=422, detail="No extractable text found in the uploaded file.")

    all_chunks = []
    for doc in docs:
        chunks = chunk_text(
            text=doc["content"],
            source=file.filename,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        all_chunks.extend(chunks)

    texts = [c["text"] for c in all_chunks]
    embeddings = generate_embeddings(texts)
    insert_chunks(collection, all_chunks, embeddings)

    total = collection.count()
    logger.info("Ingested '%s' → %d new chunks (total: %d).", file.filename, len(all_chunks), total)

    return IngestResponse(
        filename=file.filename,
        chunks_added=len(all_chunks),
        total_indexed=total,
    )


@router.post("/notify", response_model=NotifyResponse)
async def notify_subscribers(
    body: NotifyRequest,
    current_user: TokenData = Depends(require_organizer),
):
    """
    Send a WhatsApp notification to all subscribers about a newly ingested document.
    The organizer triggers this manually after uploading a file.
    """
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
        )

    subscribers = load_subscribers()
    if not subscribers:
        return NotifyResponse(sent_to=0, message="No subscribers registered.")

    summary_text = body.summary.strip() if body.summary else f"{body.chunks_added} new passages indexed."

    message = (
        f"📄 *New Document Added to CIVIC AI*\n\n"
        f"*File:* {body.filename}\n"
        f"*Chunks Indexed:* {body.chunks_added}\n\n"
        f"*Summary:*\n{summary_text}\n\n"
        f"Visit the CIVIC AI dashboard to ask questions about this document."
    )

    sent = 0
    for phone in subscribers:
        try:
            send_text_message(
                phone=phone,
                message=message,
                access_token=settings.WHATSAPP_ACCESS_TOKEN,
                phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
            )
            sent += 1
        except Exception as exc:
            logger.warning("Failed to notify %s: %s", phone, exc)

    logger.info("Notified %d/%d subscribers about '%s'.", sent, len(subscribers), body.filename)
    return NotifyResponse(sent_to=sent, message=f"Notification sent to {sent} of {len(subscribers)} subscribers.")
