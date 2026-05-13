"""
backend/auth.py
────────────────
JWT authentication utilities for CIVIC AI.

Roles
-----
  resident  — read-only  (POST /ask)
  organizer — full access (POST /ask + POST /ingest/file)

Password hashing
─────────────────
Uses Python's built-in hashlib PBKDF2-HMAC-SHA256 — no bcrypt dependency.

Demo users (in-memory — swap for a real DB in production)
──────────────────────────────────────────────────────────
  username: resident   password: resident123   role: resident
  username: organizer  password: organizer123  role: organizer
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

# ── Password hashing (PBKDF2-HMAC-SHA256, built into Python stdlib) ───────────

_ITERATIONS = 260_000
_HASH_SEP = "$"  # format: pbkdf2$<hex-salt>$<hex-hash>


def hash_password(plain: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, _ITERATIONS)
    return f"pbkdf2{_HASH_SEP}{salt.hex()}{_HASH_SEP}{dk.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    try:
        _, salt_hex, hash_hex = stored.split(_HASH_SEP)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, _ITERATIONS)
    return hmac.compare_digest(dk.hex(), hash_hex)


# ── In-memory user store ──────────────────────────────────────────────────────

class UserRecord(BaseModel):
    username: str
    hashed_password: str
    role: str   # "resident" | "organizer"


# Passwords are hashed at import time — never stored in plaintext.
_USERS: dict[str, UserRecord] = {
    "resident": UserRecord(
        username="resident",
        hashed_password=hash_password("resident123"),
        role="resident",
    ),
    "organizer": UserRecord(
        username="organizer",
        hashed_password=hash_password("organizer123"),
        role="organizer",
    ),
}


def get_user(username: str) -> Optional[UserRecord]:
    return _USERS.get(username)


def authenticate_user(username: str, password: str) -> Optional[UserRecord]:
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


# ── Token payload ─────────────────────────────────────────────────────────────

class TokenData(BaseModel):
    username: str
    role: str


def create_access_token(data: TokenData) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRE_MINUTES
    )
    payload = {"sub": data.username, "role": data.role, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Bearer scheme + decode ────────────────────────────────────────────────────

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def _decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        username: str = payload.get("sub", "")
        role: str = payload.get("role", "resident")
        if not username:
            raise _CREDENTIALS_EXC
        return TokenData(username=username, role=role)
    except JWTError:
        raise _CREDENTIALS_EXC


# ── Reusable FastAPI dependencies ─────────────────────────────────────────────

def get_current_user(token: str = Depends(_oauth2_scheme)) -> TokenData:
    """Decode + validate bearer token; raise 401 on failure."""
    return _decode_token(token)


def require_resident(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Any valid token (resident or organizer) passes."""
    return current_user


def require_organizer(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Only organizer-role tokens pass; others receive 403."""
    if current_user.role != "organizer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer role required for this endpoint",
        )
    return current_user



# ── In-memory user store ──────────────────────────────────────────────────────

class UserRecord(BaseModel):
    username: str
    hashed_password: str
    role: str   # "resident" | "organizer"


# Passwords are hashed at import time — never stored in plaintext.
_USERS: dict[str, UserRecord] = {
    "resident": UserRecord(
        username="resident",
        hashed_password=hash_password("resident123"),
        role="resident",
    ),
    "organizer": UserRecord(
        username="organizer",
        hashed_password=hash_password("organizer123"),
        role="organizer",
    ),
}


def get_user(username: str) -> Optional[UserRecord]:
    return _USERS.get(username)


def authenticate_user(username: str, password: str) -> Optional[UserRecord]:
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


# ── Token payload ─────────────────────────────────────────────────────────────

class TokenData(BaseModel):
    username: str
    role: str


def create_access_token(data: TokenData) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRE_MINUTES
    )
    payload = {"sub": data.username, "role": data.role, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Bearer scheme + decode ────────────────────────────────────────────────────

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def _decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        username: str = payload.get("sub", "")
        role: str = payload.get("role", "resident")
        if not username:
            raise _CREDENTIALS_EXC
        return TokenData(username=username, role=role)
    except JWTError:
        raise _CREDENTIALS_EXC


# ── Reusable FastAPI dependencies ─────────────────────────────────────────────

def get_current_user(token: str = Depends(_oauth2_scheme)) -> TokenData:
    """Decode + validate bearer token; raise 401 on failure."""
    return _decode_token(token)


def require_resident(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Any valid token (resident or organizer) passes."""
    return current_user


def require_organizer(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Only organizer-role tokens pass; others receive 403."""
    if current_user.role != "organizer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer role required for this endpoint",
        )
    return current_user
