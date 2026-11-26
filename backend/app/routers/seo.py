"""sitemap.xml and robots.txt, so search engines can find the public pages."""
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..config import settings
from ..db import get_conn

router = APIRouter(tags=["seo"])
Conn = Annotated[Connection, Depends(get_conn)]

LEARN_MODULES = ["recursion", "sorting", "graphs", "greedy", "dynamic-programming", "np-hardness", "derivatives", "limits", "integrals", "matrices"]  # keep in sync with frontend/src/learn/modules.ts
STATIC_PATHS = ["/", "/browse", "/learn", *[f"/learn/{m}" for m in LEARN_MODULES], "/about", "/support", "/contact"]
PRIVATE_PATHS = ["/admin", "/my-uploads", "/upload", "/login", "/signup",
                 "/forgot-password", "/reset-password", "/api/"]


def _base() -> str:
    return settings.public_url.rstrip("/")


@router.api_route("/robots.txt", methods=["GET", "HEAD"], include_in_schema=False)
def robots() -> Response:
    lines = ["User-agent: *"] + [f"Disallow: {p}" for p in PRIVATE_PATHS]
    lines.append(f"Sitemap: {_base()}/sitemap.xml")
    return Response("\n".join(lines) + "\n", media_type="text/plain")


@router.api_route("/sitemap.xml", methods=["GET", "HEAD"], include_in_schema=False)
def sitemap(conn: Conn) -> Response:
    # Only courses that are approved AND have at least one published material.
    rows = conn.execute(
        text(
            """
            SELECT c.id, max(m.created_at) AS updated
            FROM courses c JOIN materials m ON m.course_id = c.id
            WHERE c.status = 'approved' AND m.status = 'published'
            GROUP BY c.id ORDER BY c.id LIMIT 49000
            """
        )
    ).mappings().all()
    urls = [f"  <url><loc>{_base()}{p}</loc></url>" for p in STATIC_PATHS]
    for r in rows:
        urls.append(
            f"  <url><loc>{_base()}/courses/{r['id']}</loc>"
            f"<lastmod>{r['updated'].date().isoformat()}</lastmod></url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(xml, media_type="application/xml")
