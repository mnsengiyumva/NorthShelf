from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn

router = APIRouter(prefix="/api", tags=["catalog"])
Conn = Annotated[Connection, Depends(get_conn)]


@router.get("/regions")
def list_regions(conn: Conn, type: str | None = None, parent_code: str | None = None):
    """e.g. /api/regions?type=province"""
    sql = """
        SELECT r.id, r.type, r.code, r.name_en, r.name_fr, p.code AS parent_code
        FROM regions r
        LEFT JOIN regions p ON p.id = r.parent_id
        WHERE (CAST(:type AS text) IS NULL OR r.type = CAST(:type AS text))
          AND (CAST(:parent_code AS text) IS NULL OR p.code = CAST(:parent_code AS text))
        ORDER BY r.name_en
    """
    rows = conn.execute(text(sql), {"type": type, "parent_code": parent_code})
    return [dict(r) for r in rows.mappings()]


@router.get("/levels")
def list_levels(conn: Conn):
    rows = conn.execute(text(
        "SELECT id, slug, name_en, name_fr FROM education_levels ORDER BY sort_order"
    ))
    return [dict(r) for r in rows.mappings()]


@router.get("/material-types")
def list_material_types(conn: Conn):
    rows = conn.execute(text(
        "SELECT id, slug, name_en, name_fr FROM material_types ORDER BY name_en"
    ))
    return [dict(r) for r in rows.mappings()]


@router.get("/courses")
def list_courses(
    conn: Conn,
    level: str | None = None,          # 'high_school' | 'college' | 'university'
    region: str | None = None,         # e.g. 'CA-ON'
    institution_id: int | None = None,
    subject: str | None = None,        # e.g. 'mathematics'
    language: str | None = None,       # 'en' | 'fr'
    q: str | None = None,              # search in code/title
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    sql = """
        SELECT c.id, c.code, c.title, c.grade, c.language,
               l.slug AS level, r.code AS region_code,
               i.name AS institution, s.slug AS subject
        FROM courses c
        JOIN education_levels l ON l.id = c.level_id
        JOIN regions r ON r.id = c.region_id
        LEFT JOIN institutions i ON i.id = c.institution_id
        LEFT JOIN subjects s ON s.id = c.subject_id
        WHERE c.status = 'approved'
          AND (CAST(:level AS text) IS NULL OR l.slug = CAST(:level AS text))
          AND (CAST(:region AS text) IS NULL OR r.code = CAST(:region AS text))
          AND (CAST(:institution_id AS int) IS NULL OR c.institution_id = CAST(:institution_id AS int))
          AND (CAST(:subject AS text) IS NULL OR s.slug = CAST(:subject AS text))
          AND (CAST(:language AS text) IS NULL OR c.language = CAST(:language AS text))
          AND (CAST(:q AS text) IS NULL
               OR c.title ILIKE '%' || CAST(:q AS text) || '%'
               OR c.code ILIKE '%' || CAST(:q AS text) || '%')
        ORDER BY c.code
        LIMIT :limit OFFSET :offset
    """
    params = {
        "level": level, "region": region, "institution_id": institution_id,
        "subject": subject, "language": language, "q": q,
        "limit": limit, "offset": offset,
    }
    rows = conn.execute(text(sql), params)
    return [dict(r) for r in rows.mappings()]
