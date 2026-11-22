import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn
from ..security import require_moderator
from .materials import MATERIAL_SELECT

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_moderator)]
)
Conn = Annotated[Connection, Depends(get_conn)]


@router.get("/materials")
def review_queue(conn: Conn, status: str = "pending"):
    sql = (
        MATERIAL_SELECT.replace(
            "u.display_name AS uploader",
            "u.display_name AS uploader, l.name AS license, m.own_work_confirmed",
        )
        + " JOIN licenses l ON l.id = m.license_id"
        + " WHERE m.status = :status ORDER BY m.created_at"
    )
    rows = conn.execute(text(sql), {"status": status})
    return [dict(r) for r in rows.mappings()]


def _set_status(conn: Connection, material_id: uuid.UUID, new_status: str) -> dict:
    row = conn.execute(
        text(
            "UPDATE materials SET status = :s WHERE id = :id AND status IN ('pending', 'flagged') "
            "RETURNING id, status"
        ),
        {"s": new_status, "id": str(material_id)},
    ).mappings().first()
    conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="No pending material with that id")
    return dict(row)


@router.post("/materials/{material_id}/approve")
def approve(material_id: uuid.UUID, conn: Conn):
    return _set_status(conn, material_id, "published")


@router.post("/materials/{material_id}/reject")
def reject(material_id: uuid.UUID, conn: Conn):
    return _set_status(conn, material_id, "removed")
