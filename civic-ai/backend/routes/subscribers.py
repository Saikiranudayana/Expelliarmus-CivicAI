"""
backend/routes/subscribers.py
──────────────────────────────
Manage WhatsApp subscriber registrations.

Endpoints
---------
GET    /subscribers          — list all subscribers (organizer only)
POST   /subscribers          — add a phone number (public — residents self-register)
DELETE /subscribers/{phone}  — remove a phone number (organizer only)
"""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from config import settings
from backend.auth import require_organizer, TokenData
from services.whatsapp_notifier import load_subscribers, add_subscriber, remove_subscriber, send_text_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscribers", tags=["subscribers"])

_E164_RE = re.compile(r"^\+?[1-9]\d{6,14}$")


class SubscribeRequest(BaseModel):
    phone: str  # E.164, e.g. "+919876543210" or "919876543210"
    name: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().lstrip("+")
        if not _E164_RE.match(v):
            raise ValueError(
                "phone must be a valid E.164 number (7-15 digits, no spaces)"
            )
        return v


class SubscriberOut(BaseModel):
    phone: str
    total: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
async def list_subscribers(_: TokenData = Depends(require_organizer)):
    """Return all registered subscriber phone numbers (organizer only)."""
    subs = load_subscribers()
    return {"subscribers": subs, "total": len(subs)}


@router.post("", response_model=SubscriberOut, status_code=status.HTTP_201_CREATED)
async def subscribe(body: SubscribeRequest):
    """
    Register a WhatsApp phone number to receive CIVIC AI notifications.
    Open endpoint — no login required so residents can self-register.
    """
    added = add_subscriber(body.phone)
    if not added:
        # Already registered — return 200 instead of error
        subs = load_subscribers()
        return SubscriberOut(phone=body.phone, total=len(subs))

    subs = load_subscribers()
    logger.info("New subscriber registered: %s", body.phone)
    return SubscriberOut(phone=body.phone, total=len(subs))


@router.delete("/{phone}", status_code=status.HTTP_200_OK)
async def unsubscribe(phone: str, _: TokenData = Depends(require_organizer)):
    """Remove a subscriber (organizer only)."""
    phone = phone.strip().lstrip("+")
    removed = remove_subscriber(phone)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{phone} is not a registered subscriber.")
    subs = load_subscribers()
    return {"removed": phone, "total": len(subs)}


class BroadcastRequest(BaseModel):
    message: str


@router.post("/broadcast", status_code=status.HTTP_200_OK, tags=["subscribers"])
async def broadcast_to_subscribers(
    body: BroadcastRequest,
    _: TokenData = Depends(require_organizer),
):
    """
    Send a custom WhatsApp message to every registered subscriber.
    Organizer only.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    token = settings.WHATSAPP_ACCESS_TOKEN
    phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID

    if not token or not phone_number_id:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
        )

    subscribers = load_subscribers()
    if not subscribers:
        return {"sent": 0, "failed": 0, "total": 0, "detail": "No subscribers registered."}

    sent = failed = 0
    for phone in subscribers:
        ok = send_text_message(phone, body.message.strip(), token, phone_number_id)
        if ok:
            sent += 1
        else:
            failed += 1

    logger.info("Broadcast sent — sent=%d  failed=%d", sent, failed)
    return {"sent": sent, "failed": failed, "total": len(subscribers)}
