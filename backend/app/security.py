import datetime as dt
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from .config import settings
from .db import get_conn

_hasher = PasswordHasher()
# Used to keep login timing similar whether or not the email exists
_DUMMY_HASH = _hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(user_id: str) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + dt.timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_user_optional(
    conn: Annotated[Connection, Depends(get_conn)],
    session: Annotated[str | None, Cookie(alias=settings.cookie_name)] = None,
) -> dict | None:
    """Returns the logged-in user (a dict) or None. Never raises."""
    if not session:
        return None
    try:
        payload = jwt.decode(session, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload["sub"]
        row = conn.execute(
            text("SELECT id, email, display_name, role FROM users WHERE id = CAST(:id AS uuid)"),
            {"id": user_id},
        ).mappings().first()
    except Exception:
        return None
    return dict(row) if row else None


def get_current_user(
    user: Annotated[dict | None, Depends(get_current_user_optional)],
) -> dict:
    """Use as a dependency on routes that require login."""
    if user is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user


def require_moderator(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    if user["role"] not in ("moderator", "admin"):
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user
