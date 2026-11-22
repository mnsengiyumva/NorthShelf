from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

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
