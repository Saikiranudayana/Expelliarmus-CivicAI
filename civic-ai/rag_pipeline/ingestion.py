"""
civic-ai/rag_pipeline/ingestion.py
───────────────────────────────────
Ingestion pipeline supporting two sources:

  1. PDF files in /docs  (run_ingestion)
  2. Web scraping of BBMP + BenSCL  (run_web_ingestion)

Both paths:  text → chunker (512 tok / 50 overlap) → NVIDIA NeMo embeddings → ChromaDB

Run directly:
    python -m rag_pipeline.ingestion           # PDFs only
    python -m rag_pipeline.ingestion --web     # web scrape only
    python -m rag_pipeline.ingestion --all     # both
"""

import sys
import logging
from pathlib import Path

# Allow running as a top-level script from the civic-ai directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from rag_pipeline.pdf_loader import load_pdfs
from rag_pipeline.chunker import chunk_text
from rag_pipeline.embeddings import generate_embeddings
from rag_pipeline.vector_store import (
    connect_vector_store,
    get_or_create_collection,
    insert_chunks,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def run_ingestion(docs_folder: str | None = None) -> None:
    """
    Execute the full ingestion pipeline.

    Parameters
    ----------
    docs_folder : override the DOCS_FOLDER env setting (useful for tests).
    """
    docs_folder = docs_folder or settings.DOCS_FOLDER

    # ── 1. Connect to ChromaDB (local file, no Docker) ───────────────────────
    logger.info("Connecting to ChromaDB — path=%s …", settings.CHROMA_PATH)
    connect_vector_store(path=settings.CHROMA_PATH)
    collection = get_or_create_collection(settings.CHROMA_COLLECTION)

    # ── 2. Load PDFs ──────────────────────────────────────────────────────────
    logger.info("Loading PDFs from '%s' …", docs_folder)
    documents = load_pdfs(docs_folder)

    if not documents:
        logger.warning("No PDFs to ingest. Place PDF files in '%s' and re-run.", docs_folder)
        return

    logger.info("Found %d document(s).", len(documents))

    # ── 3. Chunk ──────────────────────────────────────────────────────────────
    all_chunks = []
    for doc in documents:
        chunks = chunk_text(
            text=doc["content"],
            source=doc["source"],
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        all_chunks.extend(chunks)
        logger.info("  '%s' → %d chunk(s).", doc["source"], len(chunks))

    logger.info("Total chunks: %d.", len(all_chunks))

    # ── 4. Embed ──────────────────────────────────────────────────────────────
    logger.info(
        "Generating embeddings via NVIDIA NeMo Retriever (%s) …",
        settings.NVIDIA_EMBEDDING_MODEL,
    )
    texts = [c["text"] for c in all_chunks]
    embeddings = generate_embeddings(texts)
    logger.info("Embeddings generated: %d × %d-dim vectors.", len(embeddings), len(embeddings[0]))

    # ── 5. Store in ChromaDB ──────────────────────────────────────────────────
    logger.info("Inserting into ChromaDB collection '%s' …", settings.CHROMA_COLLECTION)
    insert_chunks(collection, all_chunks, embeddings)

    logger.info(
        "Ingestion complete — %d chunks indexed in '%s'.",
        len(all_chunks),
        settings.CHROMA_COLLECTION,
    )


def run_web_ingestion() -> int:
    """
    Scrape BBMP + BenSCL, ingest ALL scraped items into ChromaDB.

    Returns the number of new chunks stored.
    Uses scrape_all_sources() which also updates scrape_state.json so
    subsequent calls only re-ingest changed content.
    """
    from rag_pipeline.web_scraper import scrape_all_sources

    logger.info("Starting web ingestion from BBMP + BenSCL …")
    connect_vector_store(path=settings.CHROMA_PATH)
    collection = get_or_create_collection(settings.CHROMA_COLLECTION)

    all_items, new_items = scrape_all_sources()

    if not new_items:
        logger.info("No new web content to ingest.")
        return 0

    all_chunks = []
    for item in new_items:
        chunks = chunk_text(
            text=item["content"],
            source=item["source"],
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        all_chunks.extend(chunks)
        logger.info("  '%s' → %d chunk(s).", item["title"][:60], len(chunks))

    logger.info("Total web chunks: %d.", len(all_chunks))

    embeddings = generate_embeddings([c["text"] for c in all_chunks])
    insert_chunks(collection, all_chunks, embeddings)

    logger.info(
        "Web ingestion complete — %d chunks from %d new item(s) indexed.",
        len(all_chunks),
        len(new_items),
    )
    return len(all_chunks)


if __name__ == "__main__":
    import sys as _sys

    mode = _sys.argv[1] if len(_sys.argv) > 1 else "--pdf"
    if mode in ("--web",):
        run_web_ingestion()
    elif mode in ("--all",):
        run_ingestion()
        run_web_ingestion()
    else:
        run_ingestion()
