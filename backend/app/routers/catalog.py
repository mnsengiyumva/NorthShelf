from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..db import get_conn
from ..ratelimit import limiter
from ..security import get_current_user

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


@router.get("/subjects")
def list_subjects(conn: Conn):
    rows = conn.execute(text(
        "SELECT id, slug, name_en, name_fr FROM subjects ORDER BY name_en"
    ))
    return [dict(r) for r in rows.mappings()]


@router.get("/licenses")
def list_licenses(conn: Conn):
    rows = conn.execute(text("SELECT id, slug, name, url FROM licenses ORDER BY id"))
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


@router.get("/courses/{course_id}")
def get_course(course_id: int, conn: Conn):
    sql = """
        SELECT c.id, c.code, c.title, c.grade, c.language,
               l.slug AS level, r.code AS region_code,
               i.name AS institution, s.slug AS subject
        FROM courses c
        JOIN education_levels l ON l.id = c.level_id
        JOIN regions r ON r.id = c.region_id
        LEFT JOIN institutions i ON i.id = c.institution_id
        LEFT JOIN subjects s ON s.id = c.subject_id
        WHERE c.id = :course_id AND c.status = 'approved'
    """
    row = conn.execute(text(sql), {"course_id": course_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return dict(row)


@router.get("/institutions")
def list_institutions(
    conn: Conn,
    region: str | None = None,      # e.g. 'CA-ON'
    level: str | None = None,       # 'college' | 'university'
    q: str | None = None,
    limit: int = Query(100, ge=1, le=300),
):
    sql = """
        SELECT i.id, i.name, l.slug AS level, r.code AS region_code
        FROM institutions i
        JOIN education_levels l ON l.id = i.level_id
        JOIN regions r ON r.id = i.region_id
        WHERE i.status = 'approved'
          AND (CAST(:region AS text) IS NULL OR r.code = CAST(:region AS text))
          AND (CAST(:level AS text) IS NULL OR l.slug = CAST(:level AS text))
          AND (CAST(:q AS text) IS NULL OR i.name ILIKE '%' || CAST(:q AS text) || '%')
        ORDER BY i.name
        LIMIT :limit
    """
    rows = conn.execute(text(sql), {"region": region, "level": level, "q": q, "limit": limit})
    return [dict(r) for r in rows.mappings()]


class CourseIn(BaseModel):
    level: Literal["high_school", "college", "university"]
    region: str                                    # province/territory code, e.g. 'CA-ON'
    code: str = Field(min_length=2, max_length=20, pattern=r"^[A-Za-z0-9][A-Za-z0-9 .\-/]*$")
    title: str = Field(min_length=3, max_length=120)
    subject: str | None = None                     # subject slug
    grade: int | None = Field(default=None, ge=9, le=12)
    language: Literal["en", "fr"] = "en"
    institution_id: int | None = None              # college/university: pick an existing school...
    new_institution_name: str | None = Field(default=None, min_length=3, max_length=120)  # ...or name a new one


_COURSE_BY_ID = """
    SELECT c.id, c.code, c.title, c.grade, c.language, c.status,
           l.slug AS level, r.code AS region_code,
           i.name AS institution, s.slug AS subject
    FROM courses c
    JOIN education_levels l ON l.id = c.level_id
    JOIN regions r ON r.id = c.region_id
    LEFT JOIN institutions i ON i.id = c.institution_id
    LEFT JOIN subjects s ON s.id = c.subject_id
    WHERE c.id = :id
"""


@router.post("/courses", status_code=201)
def propose_course(
    body: CourseIn,
    user: Annotated[dict, Depends(get_current_user)],
    conn: Conn,
    response: Response,
):
    """Add a course that is missing from the catalog.

    Courses from regular users start as 'pending' and become public when a moderator
    approves an upload to them. Moderators' courses are approved immediately.
    If the course already exists, it is returned instead (existing = true).
    """
    is_staff = user["role"] in ("moderator", "admin")
    if not is_staff:
        limiter.hit(f"course:{user['id']}", limit=10, window=3600,
                    detail="You're adding courses too quickly. Please wait a little and try again.")
        pending = conn.execute(
            text("SELECT count(*) FROM courses WHERE status = 'pending' AND created_by = :uid"),
            {"uid": str(user["id"])},
        ).scalar_one()
        if pending >= 5:
            raise HTTPException(
                status_code=429,
                detail="You already have 5 new courses waiting for approval. They are approved when an upload to them is reviewed.",
            )

    region = conn.execute(
        text("SELECT id FROM regions WHERE code = :c AND type IN ('province', 'territory')"),
        {"c": body.region},
    ).first()
    if region is None:
        raise HTTPException(status_code=400, detail="Unknown province or territory")
    level_id = conn.execute(
        text("SELECT id FROM education_levels WHERE slug = :s"), {"s": body.level}
    ).scalar_one()

    subject_id = None
    if body.subject:
        subject_id = conn.execute(
            text("SELECT id FROM subjects WHERE slug = :s"), {"s": body.subject}
        ).scalar()
        if subject_id is None:
            raise HTTPException(status_code=400, detail="Unknown subject")

    # --- which school (college/university only) ---
    institution_id = None
    grade = body.grade
    if body.level == "high_school":
        if body.institution_id or body.new_institution_name:
            raise HTTPException(
                status_code=400,
                detail="High school courses are shared across the province, so no school is needed",
            )
    else:
        grade = None
        if (body.institution_id is None) == (body.new_institution_name is None):
            raise HTTPException(
                status_code=400,
                detail="Choose your school from the list, or type its name if it isn't listed",
            )
        if body.institution_id is not None:
            inst = conn.execute(
                text("SELECT id FROM institutions WHERE id = :id AND region_id = :r AND level_id = :l AND status = 'approved'"),
                {"id": body.institution_id, "r": region[0], "l": level_id},
            ).first()
            if inst is None:
                raise HTTPException(status_code=400, detail="That school doesn't match the province and level you chose")
            institution_id = inst[0]
        else:
            name = " ".join(body.new_institution_name.split())
            found = conn.execute(
                text("SELECT id FROM institutions WHERE region_id = :r AND level_id = :l AND lower(name) = lower(:n)"),
                {"r": region[0], "l": level_id, "n": name},
            ).first()
            if found:
                institution_id = found[0]
            else:
                institution_id = conn.execute(
                    text(
                        "INSERT INTO institutions (region_id, level_id, name, status) "
                        "VALUES (:r, :l, :n, :st) RETURNING id"
                    ),
                    {"r": region[0], "l": level_id, "n": name, "st": "approved" if is_staff else "pending"},
                ).scalar_one()

    code = " ".join(body.code.split())
    find_existing = text(
        """
        SELECT COALESCE(merged_into_id, id) FROM courses
        WHERE level_id = :l AND region_id = :r
          AND COALESCE(institution_id, 0) = COALESCE(CAST(:i AS int), 0)
          AND upper(code) = upper(:code) AND language = :lang
        """
    )
    params = {"l": level_id, "r": region[0], "i": institution_id, "code": code, "lang": body.language}

    existing = conn.execute(find_existing, params).scalar()
    if existing is None:
        try:
            new_id = conn.execute(
                text(
                    """
                    INSERT INTO courses (level_id, region_id, institution_id, subject_id, code, title,
                                         grade, language, status, created_by)
                    VALUES (:l, :r, :i, :subject_id, :code, :title, :grade, :lang, :status, :uid)
                    RETURNING id
                    """
                ),
                {**params, "subject_id": subject_id, "title": " ".join(body.title.split()),
                 "grade": grade, "status": "approved" if is_staff else "pending", "uid": str(user["id"])},
            ).scalar_one()
            conn.commit()
        except IntegrityError:
            conn.rollback()  # created by someone else a moment ago
            existing = conn.execute(find_existing, params).scalar()
            if existing is None:
                raise
        else:
            return {**dict(conn.execute(text(_COURSE_BY_ID), {"id": new_id}).mappings().one()), "existing": False}

    conn.commit()  # keeps a newly created school, if any
    response.status_code = 200
    return {**dict(conn.execute(text(_COURSE_BY_ID), {"id": existing}).mappings().one()), "existing": True}
