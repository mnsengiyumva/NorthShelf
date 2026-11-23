import hashlib
import secrets
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from .. import mailer
from ..config import settings
from ..db import get_conn
from ..ratelimit import client_ip, limiter
from ..security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
Conn = Annotated[Connection, Depends(get_conn)]


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=40)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _set_session_cookie(response: Response, user_id: str) -> None:
    # httpOnly: JavaScript can't read the token, which limits the damage of an XSS bug.
    # SameSite=Lax: the browser won't send it on cross-site POSTs (basic CSRF protection).
    response.set_cookie(
        key=settings.cookie_name,
        value=create_access_token(user_id),
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/signup", status_code=201)
def signup(body: SignupIn, request: Request, response: Response, conn: Conn):
    # Generous per-IP limit: a whole class may sign up from one school network.
    limiter.hit(f"signup:{client_ip(request)}", limit=20, window=3600,
                detail="Too many accounts created from this network. Please try again later.")
    try:
        row = conn.execute(
            text(
                """
                INSERT INTO users (email, display_name, password_hash)
                VALUES (:email, :display_name, :password_hash)
                RETURNING id, email, display_name, role
                """
            ),
            {
                "email": body.email.lower(),
                "display_name": body.display_name.strip(),
                "password_hash": hash_password(body.password),
            },
        ).mappings().one()
        conn.commit()
    except IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = dict(row)
    _set_session_cookie(response, str(user["id"]))
    return user


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, conn: Conn):
    email = body.email.lower()
    limiter.hit(f"login-ip:{client_ip(request)}", limit=60, window=900)
    # Brute-force protection: only FAILED attempts count against an email address.
    limiter.check(f"login-fail:{email}", limit=5, window=900,
                  detail="Too many failed attempts. Please wait a few minutes and try again.")
    row = conn.execute(
        text(
            "SELECT id, email, display_name, role, password_hash FROM users WHERE email = :email"
        ),
        {"email": email},
    ).mappings().first()

    ok = verify_password(body.password, row["password_hash"] if row else None)
    if not row or not ok:
        limiter.add(f"login-fail:{email}")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    user = {k: row[k] for k in ("id", "email", "display_name", "role")}
    _set_session_cookie(response, str(user["id"]))
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(settings.cookie_name, path="/")


@router.get("/me")
def me(user: Annotated[dict, Depends(get_current_user)]):
    return user


@router.post("/forgot-password", status_code=202)
def forgot_password(body: ForgotIn, request: Request, background: BackgroundTasks, conn: Conn):
    """Start a password reset. Always answers the same way, so it can't be used to find out
    which email addresses have accounts."""
    email = body.email.lower()
    limiter.hit(f"forgot-ip:{client_ip(request)}", limit=10, window=3600,
                detail="Too many reset requests. Please try again later.")
    limiter.hit(f"forgot-email:{email}", limit=3, window=3600,
                detail="Too many reset requests for this address. Please try again later.")

    user = conn.execute(
        text("SELECT id FROM users WHERE email = :email"), {"email": email}
    ).mappings().first()
    if user:
        token = secrets.token_urlsafe(32)
        # Only the newest link works: remove any earlier unused ones.
        conn.execute(
            text("DELETE FROM password_resets WHERE user_id = :uid AND used_at IS NULL"),
            {"uid": str(user["id"])},
        )
        conn.execute(
            text(
                "INSERT INTO password_resets (user_id, token_hash, expires_at) "
                "VALUES (:uid, :h, now() + make_interval(mins => :mins))"
            ),
            {"uid": str(user["id"]), "h": _hash_token(token), "mins": settings.password_reset_minutes},
        )
        conn.commit()
        link = f"{settings.public_url.rstrip('/')}/reset-password?token={token}"
        background.add_task(mailer.send_password_reset, email, link)

    return {"detail": "If an account exists for that email, a reset link is on its way."}


@router.post("/reset-password")
def reset_password(body: ResetIn, request: Request, conn: Conn):
    limiter.hit(f"reset-ip:{client_ip(request)}", limit=20, window=3600,
                detail="Too many attempts. Please try again later.")

    row = conn.execute(
        text(
            "SELECT id, user_id FROM password_resets "
            "WHERE token_hash = :h AND used_at IS NULL AND expires_at > now() FOR UPDATE"
        ),
        {"h": _hash_token(body.token)},
    ).mappings().first()
    if row is None:
        conn.rollback()
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    conn.execute(
        text("UPDATE users SET password_hash = :ph, password_changed_at = now() WHERE id = :uid"),
        {"ph": hash_password(body.password), "uid": str(row["user_id"])},
    )
    conn.execute(text("UPDATE password_resets SET used_at = now() WHERE id = :id"), {"id": row["id"]})
    conn.execute(
        text("DELETE FROM password_resets WHERE user_id = :uid AND used_at IS NULL"),
        {"uid": str(row["user_id"])},
    )
    conn.commit()
    return {"detail": "Your password has been changed. You can now log in."}
