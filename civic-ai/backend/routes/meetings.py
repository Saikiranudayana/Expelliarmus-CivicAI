"""
backend/routes/meetings.py
───────────────────────────
Meeting organizer endpoints for community event management.

Endpoints:
  GET    /meetings           — list all meetings
  POST   /meetings           — create a new meeting
  DELETE /meetings/{id}      — remove a meeting
  POST   /meetings/{id}/notify — send WhatsApp alert to all subscribers
"""

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from backend.auth import require_organizer, require_resident, TokenData
from services.whatsapp_notifier import load_subscribers, send_text_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/meetings", tags=["meetings"])

MEETINGS_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "meetings.json"


# ── Models ────────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    date: str = Field(..., description="ISO date string, e.g. 2026-06-15")
    time: str = Field(..., description="Time string, e.g. 10:00 AM")
    location: str = Field(..., min_length=2, max_length=300)
    description: str = Field("", max_length=1000)
    ward: Optional[str] = Field(None, max_length=100)


class Meeting(BaseModel):
    id: str
    title: str
    date: str
    time: str
    location: str
    description: str
    ward: Optional[str]
    created_at: str
    created_by: str


class NotifyMeetingResponse(BaseModel):
    sent_to: int
    message: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_meetings() -> List[dict]:
    MEETINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if MEETINGS_FILE.exists():
        with MEETINGS_FILE.open() as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    return []


def _save_meetings(meetings: List[dict]) -> None:
    MEETINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with MEETINGS_FILE.open("w") as f:
        json.dump(meetings, f, indent=2)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[Meeting])
async def list_meetings(current_user: TokenData = Depends(require_resident)):
    """Return all meetings, sorted by date ascending."""
    meetings = _load_meetings()
    meetings.sort(key=lambda m: m.get("date", ""), reverse=False)
    return meetings


@router.post("", response_model=Meeting)
async def create_meeting(
    body: MeetingCreate,
    current_user: TokenData = Depends(require_organizer),
):
    """Create a new meeting. Organizer-only."""
    meetings = _load_meetings()
    new_meeting = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "date": body.date,
        "time": body.time,
        "location": body.location,
        "description": body.description,
        "ward": body.ward,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user.username,
    }
    meetings.append(new_meeting)
    _save_meetings(meetings)
    logger.info("Meeting created: %s by %s", new_meeting["title"], current_user.username)
    return new_meeting


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: TokenData = Depends(require_organizer),
):
    """Delete a meeting by ID. Organizer-only."""
    meetings = _load_meetings()
    original_len = len(meetings)
    meetings = [m for m in meetings if m.get("id") != meeting_id]
    if len(meetings) == original_len:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    _save_meetings(meetings)
    return {"detail": "Meeting deleted."}


@router.post("/{meeting_id}/notify", response_model=NotifyMeetingResponse)
async def notify_meeting(
    meeting_id: str,
    current_user: TokenData = Depends(require_organizer),
):
    """Send a WhatsApp notification about a meeting to all subscribers."""
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp credentials not configured.",
        )

    meetings = _load_meetings()
    meeting = next((m for m in meetings if m.get("id") == meeting_id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    subscribers = load_subscribers()
    if not subscribers:
        return NotifyMeetingResponse(sent_to=0, message="No subscribers registered.")

    ward_line = f"\n*Ward:* {meeting['ward']}" if meeting.get("ward") else ""
    desc_line = f"\n\n{meeting['description']}" if meeting.get("description") else ""

    message = (
        f"🏛️ *Upcoming Community Meeting — CIVIC AI*\n\n"
        f"*{meeting['title']}*\n\n"
        f"📅 *Date:* {meeting['date']}\n"
        f"🕐 *Time:* {meeting['time']}\n"
        f"📍 *Location:* {meeting['location']}"
        f"{ward_line}"
        f"{desc_line}\n\n"
        f"Reply to this message to ask CIVIC AI any questions about this meeting."
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

    logger.info(
        "Meeting notification sent: %d/%d subscribers for '%s'.",
        sent, len(subscribers), meeting["title"],
    )
    return NotifyMeetingResponse(
        sent_to=sent,
        message=f"Notification sent to {sent} of {len(subscribers)} subscribers.",
    )
