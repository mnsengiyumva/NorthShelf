from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn

router = APIRouter(prefix="/api", tags=["materials"])
Conn = Annotated[Connection, Depends(get_conn)]

# Only 'published' materials are ever visible to the public.
MATERIAL_SELECT = """
    SELECT m.id, m.title, m.description, m.academic_year, m.term, m.language,
           m.download_count, m.created_at,
           c.id AS course_id, c.code AS course_code, c.title AS course_title,
           t.slug AS type, t.name_en AS type_name
    FROM materials m
    JOIN courses c ON c.id = m.course_id
    JOIN material_types t ON t.id = m.type_id
"""


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
def get_material(material_id: str, conn: Conn):
    sql = MATERIAL_SELECT + " WHERE m.id = CAST(:id AS uuid) AND m.status = 'published'"
    try:
        row = conn.execute(text(sql), {"id": material_id}).mappings().first()
    except Exception:
        # malformed UUID
        raise HTTPException(status_code=404, detail="Material not found")
    if row is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return dict(row)
