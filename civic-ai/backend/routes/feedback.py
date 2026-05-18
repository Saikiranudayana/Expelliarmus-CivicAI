"""
backend/routes/feedback.py
──────────────────────────
POST /feedback — accept community feedback and append to data/feedback.json.
"""
import json
import os
import time
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/feedback", tags=["feedback"])

_DATA_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "feedback.json")
)


class FeedbackIn(BaseModel):
    type: str           # bug | wrong_data | suggestion | praise | other
    subject: str
    message: str
    name: Optional[str] = None
    email: Optional[str] = None


@router.post("", status_code=201)
async def submit_feedback(body: FeedbackIn):
    """Append one feedback entry to data/feedback.json and return its id."""
    if os.path.exists(_DATA_FILE):
        with open(_DATA_FILE, encoding="utf-8") as f:
            items: list = json.load(f)
    else:
        items = []

    entry = body.model_dump(exclude_none=False)
    entry["ts"] = int(time.time())
    entry["id"] = len(items) + 1
    items.append(entry)

    with open(_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    return {"ok": True, "id": entry["id"]}
