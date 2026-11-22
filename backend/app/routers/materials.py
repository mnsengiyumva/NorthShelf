import hashlib
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from .. import storage
from ..config import settings
from ..db import get_conn
from ..ratelimit import limiter
from ..security import get_current_user, get_current_user_optional

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["materials"])
Conn = Annotated[Connection, Depends(get_conn)]

# Public listings only ever show 'published' materials.
MATERIAL_SELECT = """
    SELECT m.id, m.title, m.description, m.academic_year, m.term, m.language,
           m.download_count, m.created_at, m.file_size, m.mime_type, m.status,
           c.id AS course_id, c.code AS course_code, c.title AS course_title,
           t.slug AS type, t.name_en AS type_name,
           u.display_name AS uploader
    FROM materials m
    JOIN courses c ON c.id = m.course_id
    JOIN material_types t ON t.id = m.type_id
    JOIN users u ON u.id = m.uploader_id
"""

# Allowed uploads, identified by their actual first bytes (never by file name).
FILE_SIGNATURES = [
    (b"%PDF-", "pdf", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "png", "image/png"),
    (b"\xff\xd8\xff", "jpg", "image/jpeg"),
]


def detect_file_type(data: bytes) -> tuple[str, str] | None:
    for magic, ext, mime in FILE_SIGNATURES:
        if data.startswith(magic):
            return ext, mime
    return None


@router.get("/materials")
def list_materials(
    conn: Conn,
    course_id: int | None = None,
    type: str | None = None,       # material type slug, e.g. 'past_exam'
    year: int | None = None,
    q: str | None = None,          # search in title
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    sql = MATERIAL_SELECT + """
        WHERE m.status = 'published'
          AND (CAST(:course_id AS int) IS NULL OR m.course_id = CAST(:course_id AS int))
          AND (CAST(:type AS text) IS NULL OR t.slug = CAST(:type AS text))
          AND (CAST(:year AS int) IS NULL OR m.academic_year = CAST(:year AS int))
          AND (CAST(:q AS text) IS NULL OR m.title ILIKE '%' || CAST(:q AS text) || '%')
        ORDER BY m.academic_year DESC NULLS LAST, m.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    params = {
        "course_id": course_id, "type": type, "year": year, "q": q,
        "limit": limit, "offset": offset,
    }
    rows = conn.execute(text(sql), params)
    return [dict(r) for r in rows.mappings()]


@router.get("/materials/{material_id}")
def get_material(material_id: uuid.UUID, conn: Conn):
    sql = MATERIAL_SELECT + " WHERE m.id = :id AND m.status = 'published'"
    row = conn.execute(text(sql), {"id": str(material_id)}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return dict(row)


@router.post("/materials", status_code=201)
def upload_material(
    user: Annotated[dict, Depends(get_current_user)],
    conn: Conn,
    file: Annotated[UploadFile, File()],
    course_id: Annotated[int, Form()],
    material_type: Annotated[str, Form()],          # slug, e.g. 'past_exam'
    title: Annotated[str, Form(min_length=3, max_length=150)],
    license: Annotated[str, Form()],                 # slug, e.g. 'cc-by'
    own_work_confirmed: Annotated[bool, Form()],
    language: Annotated[str, Form(pattern="^(en|fr)$")] = "en",
    academic_year: Annotated[int | None, Form(ge=1990, le=2100)] = None,
    term: Annotated[str | None, Form(max_length=30)] = None,
    description: Annotated[str | None, Form(max_length=1000)] = None,
):
    if not own_work_confirmed:
        raise HTTPException(
            status_code=400,
            detail="You must confirm that this is your own work or that you have permission to share it",
        )

    # --- per-user limits (moderators and admins are exempt) ---
    is_staff = user["role"] in ("moderator", "admin")
    usage = None
    if not is_staff:
        limiter.hit(f"upload:{user['id']}", limit=10, window=3600,
                    detail="You're uploading too quickly. Please wait a little and try again.")
        usage = conn.execute(
            text(
                """
                SELECT count(*) FILTER (WHERE status IN ('pending', 'flagged')) AS pending,
                       count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS last_day,
                       COALESCE(sum(file_size) FILTER (WHERE status <> 'removed'), 0) AS stored_bytes
                FROM materials WHERE uploader_id = :uid
                """
            ),
            {"uid": str(user["id"])},
        ).mappings().one()
        if usage["pending"] >= settings.max_pending_per_user:
            raise HTTPException(
                status_code=429,
                detail=f"You already have {usage['pending']} uploads waiting for review. "
                       "Please wait until some are approved before uploading more.",
            )
        if usage["last_day"] >= settings.max_uploads_per_day:
            raise HTTPException(
                status_code=429,
                detail=f"Daily upload limit reached ({settings.max_uploads_per_day} per 24 hours). Please try again tomorrow.",
            )

    # --- read and validate the file ---
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(max_bytes + 1)
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="The file is empty")
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413, detail=f"File is too large (limit is {settings.max_upload_mb} MB)"
        )
    detected = detect_file_type(data)
    if detected is None:
        raise HTTPException(status_code=415, detail="Only PDF, PNG and JPEG files are accepted")
    ext, mime = detected

    if usage is not None and (
        usage["stored_bytes"] + len(data) > settings.max_user_storage_mb * 1024 * 1024
    ):
        raise HTTPException(
            status_code=429,
            detail=f"This would go over your storage allowance of {settings.max_user_storage_mb} MB. "
                   "Delete older uploads you no longer need, then try again.",
        )

    # --- look up the related records ---
    course = conn.execute(
        text("SELECT id FROM courses WHERE id = :id AND status IN ('approved', 'pending')"), {"id": course_id}
    ).first()
    if course is None:
        raise HTTPException(status_code=400, detail="Unknown course")
    type_row = conn.execute(
        text("SELECT id FROM material_types WHERE slug = :s"), {"s": material_type}
    ).first()
    if type_row is None:
        raise HTTPException(status_code=400, detail="Unknown material type")
    license_row = conn.execute(
        text("SELECT id FROM licenses WHERE slug = :s"), {"s": license}
    ).first()
    if license_row is None:
        raise HTTPException(status_code=400, detail="Unknown license")

    # --- duplicate check ---
    file_hash = hashlib.sha256(data).hexdigest()
    dup = conn.execute(
        text("SELECT 1 FROM materials WHERE file_hash = :h AND status <> 'removed'"),
        {"h": file_hash},
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="This file has already been uploaded")

    # --- store the file, then the database row ---
    key = f"materials/{uuid.uuid4()}.{ext}"
    try:
        storage.put_object(key, data, mime)
    except storage.StorageNotConfigured:
        raise HTTPException(status_code=503, detail="File storage is not set up on this server yet")
    except Exception:
        log.exception("Storing upload failed")
        raise HTTPException(status_code=502, detail="Could not store the file. Please try again")

    try:
        row = conn.execute(
            text(
                """
                INSERT INTO materials
                    (course_id, type_id, license_id, uploader_id, title, description,
                     academic_year, term, language, file_key, file_hash, file_size,
                     mime_type, own_work_confirmed, status)
                VALUES
                    (:course_id, :type_id, :license_id, :uploader_id, :title, :description,
                     :academic_year, :term, :language, :file_key, :file_hash, :file_size,
                     :mime_type, TRUE, 'pending')
                RETURNING id, status
                """
            ),
            {
                "course_id": course_id, "type_id": type_row[0], "license_id": license_row[0],
                "uploader_id": str(user["id"]), "title": title.strip(),
                "description": (description or "").strip() or None,
                "academic_year": academic_year, "term": (term or "").strip() or None,
                "language": language, "file_key": key, "file_hash": file_hash,
                "file_size": len(data), "mime_type": mime,
            },
        ).mappings().one()
        conn.commit()
    except IntegrityError:
        # Someone uploaded the same file at the same moment.
        conn.rollback()
        _safe_delete(key)
        raise HTTPException(status_code=409, detail="This file has already been uploaded")
    except Exception:
        conn.rollback()
        _safe_delete(key)
        raise

    return dict(row)


def _safe_delete(key: str) -> None:
    try:
        storage.delete_object(key)
    except Exception:
        log.exception("Could not clean up stored file %s", key)


@router.get("/materials/{material_id}/download")
def download_material(
    material_id: uuid.UUID,
    conn: Conn,
    user: Annotated[dict | None, Depends(get_current_user_optional)],
):
    row = conn.execute(
        text(
            """
            SELECT id, title, status, uploader_id, file_key, mime_type
            FROM materials WHERE id = :id
            """
        ),
        {"id": str(material_id)},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Material not found")

    if row["status"] == "removed":
        raise HTTPException(status_code=404, detail="Material not found")

    if row["status"] == "published":
        conn.execute(
            text("UPDATE materials SET download_count = download_count + 1 WHERE id = :id"),
            {"id": str(material_id)},
        )
        conn.commit()
    else:
        # Unpublished files are visible only to their uploader and to moderators.
        allowed = user is not None and (
            user["role"] in ("moderator", "admin") or str(user["id"]) == str(row["uploader_id"])
        )
        if not allowed:
            raise HTTPException(status_code=404, detail="Material not found")

    ext = row["file_key"].rsplit(".", 1)[-1]
    try:
        url = storage.presigned_download_url(
            row["file_key"], storage.safe_filename(row["title"], ext), row["mime_type"]
        )
    except storage.StorageNotConfigured:
        raise HTTPException(status_code=503, detail="File storage is not set up on this server yet")
    return RedirectResponse(url, status_code=302)


@router.get("/my/materials")
def my_materials(user: Annotated[dict, Depends(get_current_user)], conn: Conn):
    sql = MATERIAL_SELECT + " WHERE m.uploader_id = :uid ORDER BY m.created_at DESC"
    rows = conn.execute(text(sql), {"uid": str(user["id"])})
    return [dict(r) for r in rows.mappings()]


@router.delete("/my/materials/{material_id}", status_code=204)
def delete_my_material(
    material_id: uuid.UUID, user: Annotated[dict, Depends(get_current_user)], conn: Conn
):
    """Lets an uploader remove their own material; the stored file is deleted too."""
    row = conn.execute(
        text(
            "UPDATE materials SET status = 'removed' "
            "WHERE id = :id AND uploader_id = :uid AND status <> 'removed' RETURNING file_key"
        ),
        {"id": str(material_id), "uid": str(user["id"])},
    ).mappings().first()
    conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="Material not found")
    _safe_delete(row["file_key"])
