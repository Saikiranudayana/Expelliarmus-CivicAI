"""
rag_pipeline/web_scraper.py
───────────────────────────
Scrapes two Bengaluru civic portals for latest updates:

  • bbmp.gov.in        — news, tenders, circulars, events
  • opendata.benscl.com — dataset listings, data stories

Returns documents in the same {source, content} format as pdf_loader.py so
they flow through the same chunker → embeddings → ChromaDB pipeline.

New-content detection: items are hashed and compared against
data/scrape_state.json; only genuinely new/changed items trigger notifications.

⚠️  Security note: opendata.benscl.com has known XSS payloads injected into
some dashboard titles.  This module strips all HTML tags and sanitizes text
before any storage or downstream use.
"""

import hashlib
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

STATE_FILE = Path(__file__).parent.parent / "data" / "scrape_state.json"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_TIMEOUT = 20  # seconds

# Regex to strip any residual HTML / script-like content from text
_HTML_PATTERN = re.compile(r"<[^>]+>", re.IGNORECASE)
# Matches JS-looking strings: alert(...), confirm(...), eval(...), etc.
_JS_PATTERN = re.compile(
    r"\b(alert|confirm|eval|prompt|document\s*\.\s*\w+)\s*\(.*?\)",
    re.IGNORECASE | re.DOTALL,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _sanitize(text: str) -> str:
    """
    Remove HTML tags, JS injection patterns, and normalize whitespace.
    This prevents any XSS content scraped from external sites from being
    stored as-is or echoed back to users.
    """
    text = _HTML_PATTERN.sub(" ", text)
    text = _JS_PATTERN.sub("[removed]", text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines)


def _fetch(url: str) -> str | None:
    """GET *url* and return response text, or None on failure."""
    try:
        with httpx.Client(
            headers=_HEADERS, timeout=_TIMEOUT, follow_redirects=True
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception as exc:
        logger.warning("Fetch failed for %s — %s", url, exc)
        return None


def _load_state() -> Dict[str, str]:
    if STATE_FILE.exists():
        with STATE_FILE.open() as f:
            return json.load(f)
    return {}


def _save_state(state: Dict[str, str]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with STATE_FILE.open("w") as f:
        json.dump(state, f, indent=2)


# ── BBMP Scraper ──────────────────────────────────────────────────────────────

_BBMP_CIVIC_KEYWORDS = {
    "tender", "notice", "notification", "circular", "resolution",
    "order", "press", "election", "tax", "water", "road", "health",
    "ward", "campaign", "consultancy", "birth", "death", "property",
    "building", "trade", "license", "permit", "zoning", "waste",
    "polio", "vaccination", "lake", "park",
}


def scrape_bbmp() -> List[Dict]:
    """
    Scrape bbmp.gov.in for latest updates (news, tenders, events, circulars).

    Strategy:
      1. Locate the 'Latest Updates' section and extract all anchor links.
      2. Fall back to scanning all anchors filtered by civic keywords.
    """
    html = _fetch("https://bbmp.gov.in/")
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "img", "svg", "iframe", "noscript"]):
        tag.decompose()

    # ── Strategy 1: Latest Updates section ───────────────────────────────────
    anchors: List[Dict] = []
    latest_header = soup.find(
        lambda t: t.name in ("h2", "h3", "h4", "div", "span")
        and t.get_text(strip=True) == "Latest Updates"
    )
    if latest_header:
        container = latest_header.find_parent()
        if container:
            for a in container.find_all("a", href=True):
                title = _sanitize(a.get_text(strip=True))
                href = a["href"].strip()
                if title and len(title) > 10:
                    full_url = (
                        href
                        if href.startswith("http")
                        else f"https://bbmp.gov.in{href}"
                    )
                    anchors.append({"title": title, "url": full_url})

    # ── Strategy 2: Keyword-filtered full-page scan ───────────────────────────
    if not anchors:
        for a in soup.find_all("a", href=True):
            title = _sanitize(a.get_text(strip=True))
            href = a["href"].strip()
            if (
                title
                and len(title) > 15
                and any(kw in title.lower() for kw in _BBMP_CIVIC_KEYWORDS)
            ):
                full_url = (
                    href
                    if href.startswith("http")
                    else f"https://bbmp.gov.in{href}"
                )
                anchors.append({"title": title, "url": full_url})

    # De-duplicate by title
    seen: set = set()
    items: List[Dict] = []
    for a in anchors:
        t = a["title"]
        if t in seen:
            continue
        seen.add(t)
        content = _sanitize(
            f"Source: BBMP — Greater Bengaluru Authority (bbmp.gov.in)\n"
            f"Title: {t}\n"
            f"Link: {a['url']}\n"
            f"Category: BBMP Official Update"
        )
        items.append(
            {
                "source": f"BBMP:{_hash(t)}",
                "url": a["url"],
                "title": t,
                "content": content,
            }
        )

    logger.info("BBMP scraper — %d items extracted.", len(items))
    return items


# ── OpenData BenSCL Scraper ───────────────────────────────────────────────────

_BENSCL_SKIP_TITLES = {
    "login", "register", "search", "home", "about", "groups",
    "stories", "dashboards", "topics", "faqs", "additional links",
    "latest data stories", "vrm", "skip to main content",
    "bengaluru smart city limited",
}


def scrape_opendata_benscl() -> List[Dict]:
    """
    Scrape opendata.benscl.com for dataset listings and data stories.

    Scrapes home page + stories page.
    All text is sanitized to remove injected XSS content found in portal.
    """
    pages = [
        ("https://opendata.benscl.com/", "Open Data Portal"),
        ("https://opendata.benscl.com/?q=stories", "Data Stories"),
    ]
    items: List[Dict] = []

    for page_url, section_name in pages:
        html = _fetch(page_url)
        if not html:
            continue

        soup = BeautifulSoup(html, "lxml")
        # ⚠️ Strip scripts/styles/media — also removes XSS payloads in DOM
        for tag in soup(["script", "style", "img", "svg", "iframe", "noscript"]):
            tag.decompose()

        seen: set = set()
        for h_tag in soup.find_all(["h2", "h3"]):
            raw_title = h_tag.get_text(strip=True)
            title = _sanitize(raw_title)

            if not title or len(title) < 5:
                continue
            if title.lower() in _BENSCL_SKIP_TITLES:
                continue
            if title in seen:
                continue
            seen.add(title)

            # Collect up to 3 following sibling paragraphs as description
            description_parts: List[str] = []
            sibling = h_tag.find_next_sibling()
            for _ in range(3):
                if sibling is None or sibling.name in ("h2", "h3"):
                    break
                text = _sanitize(sibling.get_text(strip=True))
                if text:
                    description_parts.append(text)
                sibling = sibling.find_next_sibling()

            description = " ".join(description_parts)
            content = _sanitize(
                f"Source: Bengaluru Open Data Portal — BenSCL (opendata.benscl.com)\n"
                f"Section: {section_name}\n"
                f"Title: {title}\n"
                f"Description: {description}\n"
                f"Link: {page_url}"
            )
            items.append(
                {
                    "source": f"BenSCL:{_hash(title)}",
                    "url": page_url,
                    "title": title,
                    "content": content,
                }
            )

    logger.info("OpenData BenSCL scraper — %d items extracted.", len(items))
    return items


# ── Unified entry point ───────────────────────────────────────────────────────

def scrape_all_sources() -> Tuple[List[Dict], List[Dict]]:
    """
    Scrape BBMP + BenSCL and detect genuinely new/changed items.

    Returns
    -------
    all_items  : every scraped item (for full re-ingestion if needed)
    new_items  : only items whose content changed since last run
                 → used to trigger WhatsApp notifications
    """
    all_items = scrape_bbmp() + scrape_opendata_benscl()

    state = _load_state()
    new_items: List[Dict] = []
    updated_state = dict(state)

    for item in all_items:
        key = item["source"]
        content_hash = _hash(item["content"])
        if key not in state or state[key] != content_hash:
            new_items.append(item)
            updated_state[key] = content_hash

    _save_state(updated_state)
    logger.info(
        "Web scrape complete — %d total, %d new/changed.",
        len(all_items),
        len(new_items),
    )
    return all_items, new_items
