from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn

router = APIRouter(tags=["health"])


@router.get("/health")
def health(conn: Annotated[Connection, Depends(get_conn)]):
    conn.execute(text("SELECT 1"))
    return {"status": "ok"}
