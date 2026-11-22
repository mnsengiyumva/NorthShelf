import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn
from .materials import _safe_delete
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
            "u.display_name AS uploader, l.name AS license, m.own_work_confirmed, "
            "c.status AS course_status, el.slug AS level, r.code AS region_code, i.name AS institution",
        )
        + " JOIN licenses l ON l.id = m.license_id"
        + " JOIN education_levels el ON el.id = c.level_id"
        + " JOIN regions r ON r.id = c.region_id"
        + " LEFT JOIN institutions i ON i.id = c.institution_id"
        + " WHERE m.status = :status ORDER BY m.created_at"
    )
    rows = conn.execute(text(sql), {"status": status})
    return [dict(r) for r in rows.mappings()]


def _set_status(conn: Connection, material_id: uuid.UUID, new_status: str) -> dict:
    row = conn.execute(
        text(
            "UPDATE materials SET status = :s WHERE id = :id AND status IN ('pending', 'flagged') "
            "RETURNING id, status, file_key"
        ),
        {"s": new_status, "id": str(material_id)},
    ).mappings().first()
    if row is not None and new_status == "published":
        # A new course (and school) proposed with this upload goes public with it.
        conn.execute(
            text(
                "UPDATE institutions SET status = 'approved' WHERE status = 'pending' AND id = "
                "(SELECT institution_id FROM courses WHERE id = (SELECT course_id FROM materials WHERE id = :id))"
            ),
            {"id": str(material_id)},
        )
        conn.execute(
            text(
                "UPDATE courses SET status = 'approved' WHERE status = 'pending' AND id = "
                "(SELECT course_id FROM materials WHERE id = :id)"
            ),
            {"id": str(material_id)},
        )
    conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="No pending material with that id")
    if new_status == "removed":
        _safe_delete(row["file_key"])  # rejected files are deleted from storage
    return {"id": row["id"], "status": row["status"]}


@router.post("/materials/{material_id}/approve")
def approve(material_id: uuid.UUID, conn: Conn):
    return _set_status(conn, material_id, "published")


@router.post("/materials/{material_id}/reject")
def reject(material_id: uuid.UUID, conn: Conn):
    return _set_status(conn, material_id, "removed")


@router.get("/stats")
def stats(conn: Conn):
    by_status = conn.execute(
        text("SELECT status, count(*) AS n, COALESCE(sum(file_size), 0) AS bytes FROM materials GROUP BY status")
    ).mappings().all()
    recent = conn.execute(
        text("SELECT count(*) FROM materials WHERE created_at > now() - interval '24 hours'")
    ).scalar_one()
    top = conn.execute(
        text(
            """
            SELECT u.display_name, count(*) AS uploads, COALESCE(sum(m.file_size), 0) AS bytes
            FROM materials m JOIN users u ON u.id = m.uploader_id
            WHERE m.status <> 'removed'
            GROUP BY u.id, u.display_name ORDER BY bytes DESC LIMIT 5
            """
        )
    ).mappings().all()
    stored = sum(r["bytes"] for r in by_status if r["status"] != "removed")
    return {
        "stored_bytes": int(stored),
        "uploads_last_24h": recent,
        "by_status": {r["status"]: r["n"] for r in by_status},
        "top_uploaders": [dict(r) for r in top],
    }
