"""
services/scheduler.py
──────────────────────
APScheduler background job: periodically scrapes BBMP + BenSCL,
ingests new items into ChromaDB, and broadcasts WhatsApp notifications.

Integrate with FastAPI via lifespan:

    from contextlib import asynccontextmanager
    from services.scheduler import start_scheduler, stop_scheduler

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        start_scheduler()
        yield
        stop_scheduler()

    app = FastAPI(lifespan=lifespan)
"""

import logging
from typing import Dict

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


# ── Core job ──────────────────────────────────────────────────────────────────

async def _scrape_and_notify() -> None:
    """
    Full pipeline triggered on each scheduled run:
      1. Scrape BBMP + BenSCL
      2. Identify new / changed items
      3. Chunk → embed → store new items in ChromaDB
      4. Broadcast WhatsApp notifications to subscribers
    """
    # Late imports avoid circular dependencies at module load time
    from config import settings
    from rag_pipeline.web_scraper import scrape_all_sources
    from rag_pipeline.chunker import chunk_text
    from rag_pipeline.embeddings import generate_embeddings
    from rag_pipeline.vector_store import (
        connect_vector_store,
        get_or_create_collection,
        insert_chunks,
    )
    from services.whatsapp_notifier import broadcast

    logger.info("Scheduled web scrape starting …")

    try:
        all_items, new_items = scrape_all_sources()

        if not new_items:
            logger.info("No new web content — nothing to ingest or notify.")
            return

        # ── 1. Ingest new items into ChromaDB ────────────────────────────────
        connect_vector_store(path=settings.CHROMA_PATH)
        collection = get_or_create_collection(settings.CHROMA_COLLECTION)

        all_chunks = []
        for item in new_items:
            chunks = chunk_text(
                text=item["content"],
                source=item["source"],
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
            all_chunks.extend(chunks)

        if all_chunks:
            embeddings = generate_embeddings([c["text"] for c in all_chunks])
            insert_chunks(collection, all_chunks, embeddings)
            logger.info(
                "Ingested %d web chunks from %d new item(s).",
                len(all_chunks),
                len(new_items),
            )

        # ── 2. WhatsApp broadcast ─────────────────────────────────────────────
        if settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
            result = broadcast(
                new_items=new_items,
                access_token=settings.WHATSAPP_ACCESS_TOKEN,
                phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
            )
            logger.info("WhatsApp broadcast result: %s", result)
        else:
            logger.info(
                "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set — "
                "skipping broadcast."
            )

    except Exception as exc:
        logger.error("Scheduled scrape failed: %s", exc, exc_info=True)


# ── Scheduler lifecycle ───────────────────────────────────────────────────────

def start_scheduler(interval_hours: float | None = None) -> None:
    """
    Start the background scheduler.

    Parameters
    ----------
    interval_hours : override for the scrape interval.
                     Falls back to settings.SCRAPE_INTERVAL_HOURS if None.
    """
    global _scheduler

    if _scheduler is not None:
        logger.warning("Scheduler is already running — ignoring start request.")
        return

    if interval_hours is None:
        from config import settings
        interval_hours = settings.SCRAPE_INTERVAL_HOURS

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _scrape_and_notify,
        trigger=IntervalTrigger(hours=interval_hours),
        id="web_scrape_job",
        name="BBMP + BenSCL web scrape → ChromaDB → WhatsApp",
        replace_existing=True,
        misfire_grace_time=300,   # tolerate up to 5 min clock drift
    )
    _scheduler.start()
    logger.info(
        "Background scheduler started — scraping every %.1f hour(s).",
        interval_hours,
    )


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Background scheduler stopped.")


async def run_scrape_now() -> Dict:
    """
    Manually trigger an immediate scrape (useful for the /admin/scrape endpoint).
    """
    await _scrape_and_notify()
    return {"status": "completed"}
