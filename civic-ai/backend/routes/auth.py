"""
backend/routes/auth.py
───────────────────────
POST /auth/token  — exchange username + password for a JWT bearer token
GET  /auth/me     — return the caller's identity and role
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from backend.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    TokenData,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class MeResponse(BaseModel):
    username: str
    role: str


@router.post("/token", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 Password Flow — issue a signed JWT.

    Demo credentials
    ────────────────
    • resident  / resident123   → role: resident  (POST /ask only)
    • organizer / organizer123  → role: organizer (POST /ask + POST /ingest/file)
    """
    user = authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(TokenData(username=user.username, role=user.role))
    logger.info("Token issued for '%s' (role=%s)", user.username, user.role)
    return TokenResponse(access_token=token, token_type="bearer", role=user.role)


@router.get("/me", response_model=MeResponse)
async def me(current_user: TokenData = Depends(get_current_user)):
    """Return the authenticated caller's username and role."""
    return MeResponse(username=current_user.username, role=current_user.role)
