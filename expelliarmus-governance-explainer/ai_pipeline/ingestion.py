"""
Document ingestion pipeline.
Handles PDF and DOCX extraction (with OCR fallback for scanned pages).
"""
import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from docx import Document as DocxDocument
from ai_pipeline.chunking import chunk_text
from ai_pipeline.embeddings import embed_and_store


def _extract_pdf(data: bytes) -> str:
    """Extract text from a PDF; fall back to OCR for image-only pages."""
    doc = fitz.open(stream=data, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text().strip()
        if not text:
            # OCR fallback
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img)
        pages.append(text)
    return "\n".join(pages)


def _extract_docx(data: bytes) -> str:
    """Extract text from a DOCX file."""
    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def ingest_document(data: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    1. Extract text
    2. Chunk text
    3. Embed and store chunks
    Returns metadata dict.
    """
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        raw_text = _extract_pdf(data)
    elif ext in ("docx", "doc"):
        raw_text = _extract_docx(data)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    chunks = chunk_text(raw_text, source=filename)
    embed_and_store(chunks)
    return {"filename": filename, "chunks": len(chunks)}
