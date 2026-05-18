"""
backend/routes/stats.py
────────────────────────
GET /stats  — lightweight platform stats for the Live Data Ticker bar.

Data sources
────────────
  documents_ingested  — ChromaDB collection.count() via app.state.collection
  queries_today       — counted from data/recent_questions.json (already written
                        by _log_question in query.py on each /ask call)
  avg_response_ms     — not currently tracked; returns None
  latest_headline     — fetched from PIB RSS feed with a 10-minute module-level cache
  last_refresh_ts     — Unix timestamp of when this response was assembled

The endpoint never raises: all data sources degrade gracefully to 0 / None.
"""

from __future__ import annotations

import logging
import time
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stats"])

# ── RSS cache (module-level, 10-minute TTL) ───────────────────────────────────

_RSS_TTL_SECONDS = 600  # 10 minutes
_rss_cached_headline: Optional[str] = None
_rss_cache_fetched_at: float = 0.0

_RSS_URL = "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=3&Regid=3"

_QUESTIONS_FILE = (
    Path(__file__).resolve().parent.parent.parent / "data" / "recent_questions.json"
)


# ── Pydantic response model ───────────────────────────────────────────────────


class PlatformStats(BaseModel):
    documents_ingested: int
    queries_today: int
    avg_response_ms: Optional[float]
    latest_headline: Optional[str]
    last_refresh_ts: float


# ── Helpers ───────────────────────────────────────────────────────────────────


def _count_questions_today() -> int:
    """
    Count entries in recent_questions.json whose asked_at date is today (UTC).
    Returns 0 if the file is missing or malformed.
    """
    try:
        if not _QUESTIONS_FILE.exists():
            return 0
        records: list = json.loads(_QUESTIONS_FILE.read_text(encoding="utf-8"))
        today_str = date.today().isoformat()  # e.g. "2026-05-18"
        return sum(
            1
            for r in records
            if isinstance(r, dict) and r.get("asked_at", "").startswith(today_str)
        )
    except Exception as exc:
        logger.warning("Could not count questions today: %s", exc)
        return 0


def _fetch_rss_headline() -> Optional[str]:
    """
    Fetch the latest headline from the PIB governance RSS feed.
    Returns a cached value if within the TTL window.
    On any error, returns the stale cached value (or None if never fetched).
    """
    global _rss_cached_headline, _rss_cache_fetched_at

    now = time.time()
    if now - _rss_cache_fetched_at < _RSS_TTL_SECONDS:
        return _rss_cached_headline  # still fresh

    try:
        resp = httpx.get(_RSS_URL, timeout=5.0, follow_redirects=True)
        resp.raise_for_status()
        # Parse the first <title> after the channel <title>
        # (simple string approach — avoids an xml dependency)
        text = resp.text
        # Skip the channel-level <title>XXXX</title> block
        start = text.find("<item>")
        if start == -1:
            return _rss_cached_headline  # no items found, keep stale
        item_block = text[start:]
        t0 = item_block.find("<title>")
        t1 = item_block.find("</title>")
        if t0 == -1 or t1 == -1:
            return _rss_cached_headline
        raw = item_block[t0 + 7 : t1].strip()
        # Strip CDATA wrapper if present
        if raw.startswith("<![CDATA["):
            raw = raw[9:]
        if raw.endswith("]]>"):
            raw = raw[:-3]
        headline = raw.strip()
        _rss_cached_headline = headline or None
        _rss_cache_fetched_at = now
        logger.debug("RSS headline refreshed: %s", headline[:80] if headline else "(empty)")
    except Exception as exc:
        logger.warning("RSS fetch failed (non-fatal): %s", exc)
        # Return stale value — do NOT reset the cache timestamp so we
        # retry on the next request rather than hammering a broken feed.

    return _rss_cached_headline


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get("/stats", response_model=PlatformStats)
async def get_stats(request: Request) -> PlatformStats:
    """
    Returns lightweight platform stats for the ticker bar.
    Never raises — all data sources degrade gracefully.
    """
    # Document count from ChromaDB (set up in lifespan in main.py)
    documents_ingested = 0
    try:
        collection = request.app.state.collection
        documents_ingested = collection.count()
    except Exception as exc:
        logger.warning("Could not read ChromaDB count for stats: %s", exc)

    queries_today = _count_questions_today()
    latest_headline = _fetch_rss_headline()

    return PlatformStats(
        documents_ingested=documents_ingested,
        queries_today=queries_today,
        avg_response_ms=None,  # not tracked yet; future: read from a QueryLog table
        latest_headline=latest_headline,
        last_refresh_ts=time.time(),
    )
