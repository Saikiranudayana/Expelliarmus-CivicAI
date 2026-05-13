"""
services/whatsapp_notifier.py
──────────────────────────────
Send WhatsApp messages via Meta WhatsApp Cloud API.

Subscriber list is stored in data/subscribers.json as a flat list of
E.164-formatted phone numbers (e.g. "919876543210").

Public API
──────────
  send_text_message(phone, message, access_token, phone_number_id)
  broadcast(new_items, access_token, phone_number_id)
  add_subscriber(phone)
  remove_subscriber(phone)
  load_subscribers()
"""

import json
import logging
from pathlib import Path
from typing import Dict, List

import httpx

logger = logging.getLogger(__name__)

SUBSCRIBERS_FILE = Path(__file__).parent.parent / "data" / "subscribers.json"

_WHATSAPP_API_BASE = "https://graph.facebook.com/v19.0"
_MAX_MSG_LEN = 4096   # WhatsApp text body hard limit


# ── Subscriber management ─────────────────────────────────────────────────────

def load_subscribers() -> List[str]:
    """Return list of subscriber phone numbers in E.164 format."""
    if SUBSCRIBERS_FILE.exists():
        with SUBSCRIBERS_FILE.open() as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    return []


def _save_subscribers(subs: List[str]) -> None:
    SUBSCRIBERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SUBSCRIBERS_FILE.open("w") as f:
        json.dump(sorted(set(subs)), f, indent=2)


def add_subscriber(phone: str) -> bool:
    """
    Add *phone* to the subscriber list.

    Parameters
    ----------
    phone : E.164 number without '+', e.g. ``"919876543210"``

    Returns True if added, False if already present.
    """
    phone = phone.strip().lstrip("+")
    subs = load_subscribers()
    if phone in subs:
        return False
    subs.append(phone)
    _save_subscribers(subs)
    logger.info("Subscriber added: %s", phone)
    return True


def remove_subscriber(phone: str) -> bool:
    """Remove *phone* from the subscriber list. Returns True if removed."""
    phone = phone.strip().lstrip("+")
    subs = load_subscribers()
    if phone not in subs:
        return False
    _save_subscribers([p for p in subs if p != phone])
    logger.info("Subscriber removed: %s", phone)
    return True


# ── Message sending ───────────────────────────────────────────────────────────

def send_text_message(
    phone: str,
    message: str,
    access_token: str,
    phone_number_id: str,
) -> bool:
    """
    Send a plain-text WhatsApp message to a single *phone* number.

    Returns True on success (HTTP 200), False otherwise.
    """
    endpoint = f"{_WHATSAPP_API_BASE}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone.lstrip("+"),
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message[:_MAX_MSG_LEN],
        },
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
        if resp.status_code == 200:
            return True
        logger.warning(
            "WhatsApp API error for %s — HTTP %d: %s",
            phone,
            resp.status_code,
            resp.text[:300],
        )
        return False
    except Exception as exc:
        logger.error("WhatsApp request exception for %s: %s", phone, exc)
        return False


# ── Notification formatting ───────────────────────────────────────────────────

def format_notification(new_items: List[Dict]) -> str:
    """
    Format a list of new scraped items into a WhatsApp-friendly message.

    Caps at 10 items to stay within the 4096-char limit.
    """
    if not new_items:
        return ""

    lines = [
        "🏙️ *CIVIC AI — New Community Updates*",
        f"_Found {len(new_items)} new item(s) from BBMP & Bengaluru Open Data_\n",
    ]

    for item in new_items[:10]:
        title = item.get("title", "Update")
        url   = item.get("url", "")
        src   = "BBMP" if item.get("source", "").startswith("BBMP") else "BenSCL"
        lines.append(f"📌 *[{src}]* {title}")
        if url:
            lines.append(f"   🔗 {url}")
        lines.append("")

    if len(new_items) > 10:
        lines.append(
            f"_...and {len(new_items) - 10} more update(s)._\n"
            "_Visit bbmp.gov.in or opendata.benscl.com for full details._"
        )

    lines.append("—\nReply *STOP* to unsubscribe from CIVIC AI alerts.")
    return "\n".join(lines)


# ── Broadcast ─────────────────────────────────────────────────────────────────

def broadcast(
    new_items: List[Dict],
    access_token: str,
    phone_number_id: str,
) -> Dict:
    """
    Send a WhatsApp notification about *new_items* to every subscriber.

    Returns
    -------
    dict with keys: sent, failed, skipped (no items / no subscribers)
    """
    subscribers = load_subscribers()

    if not subscribers:
        logger.info("No subscribers found — broadcast skipped.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    if not new_items:
        return {"sent": 0, "failed": 0, "skipped": len(subscribers)}

    message = format_notification(new_items)

    sent = failed = 0
    for phone in subscribers:
        ok = send_text_message(phone, message, access_token, phone_number_id)
        if ok:
            sent += 1
        else:
            failed += 1

    logger.info(
        "WhatsApp broadcast complete — sent=%d  failed=%d  total_subscribers=%d",
        sent, failed, len(subscribers),
    )
    return {"sent": sent, "failed": failed, "skipped": 0}
