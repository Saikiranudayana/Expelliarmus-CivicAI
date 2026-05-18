"""
civic-ai/backend/routes/market.py
──────────────────────────────────
GET /market — financial ticker data for the dashboard marquee.

  • USD/INR   — fetched live from open.er-api.com (free, no API key needed)
               with a 5-minute in-memory TTL cache.
  • Gold 24K  — hardcoded last-known price (no free real-time gold API).
  • Petrol    — Delhi metro retail price (hardcoded; updated at deployment).
  • Diesel    — Delhi metro retail price (hardcoded; updated at deployment).

Data is current as of May 2026.
"""

import time
import logging

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["market"])

# ── Hardcoded commodity prices (Delhi/National, May 2026) ─────────────────────
_GOLD_PER_GRAM    = 9_485.0   # ₹/gram, 24K (≈ $3,400/oz @ ₹84.15/$)
_GOLD_CHANGE_PCT  = -0.55     # % change from previous close
_GOLD_CHANGE_ABS  = -52.0     # ₹ absolute change
_PETROL_DELHI     = 94.72     # ₹/litre — Delhi retail
_DIESEL_DELHI     = 87.62     # ₹/litre — Delhi retail
_SENSEX           = 82_450.0  # BSE Sensex index
_SENSEX_CHANGE    = 1.24      # % change

# ── USD/INR live cache (5-minute TTL) ─────────────────────────────────────────
_usd_inr: dict = {"rate": 84.23, "ts": 0.0}
_TTL = 300  # seconds


async def _live_usd_inr() -> float:
    """Fetch USD→INR from open.er-api.com; fall back to cached value on error."""
    now = time.time()
    if now - _usd_inr["ts"] < _TTL:
        return _usd_inr["rate"]
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get("https://open.er-api.com/v6/latest/USD")
            r.raise_for_status()
            rate: float = r.json()["rates"]["INR"]
            _usd_inr["rate"] = round(rate, 2)
            _usd_inr["ts"]   = now
            logger.info("USD/INR refreshed → ₹%.2f", rate)
            return _usd_inr["rate"]
    except Exception as exc:
        logger.warning("USD/INR fetch failed (%s) — using cached ₹%.2f", exc, _usd_inr["rate"])
        return _usd_inr["rate"]


# ── Response model ─────────────────────────────────────────────────────────────

class MarketData(BaseModel):
    gold_per_gram: float          # ₹/gram 24K
    gold_change_pct: float        # % vs prev close (negative = down)
    gold_change_abs: float        # ₹ absolute change
    petrol_delhi: float           # ₹/litre
    diesel_delhi: float           # ₹/litre
    usd_inr: float                # ₹ per 1 USD
    sensex: float                 # BSE Sensex index
    sensex_change_pct: float      # % change
    data_note: str                # freshness note shown in UI


@router.get("/market", response_model=MarketData)
async def get_market() -> MarketData:
    usd_inr = await _live_usd_inr()
    return MarketData(
        gold_per_gram      = _GOLD_PER_GRAM,
        gold_change_pct    = _GOLD_CHANGE_PCT,
        gold_change_abs    = _GOLD_CHANGE_ABS,
        petrol_delhi       = _PETROL_DELHI,
        diesel_delhi       = _DIESEL_DELHI,
        usd_inr            = usd_inr,
        sensex             = _SENSEX,
        sensex_change_pct  = _SENSEX_CHANGE,
        data_note          = "Gold/Petrol/Diesel: May 2026 · USD/INR: live",
    )
