"""Test setup.

The tests run against a throwaway PostgreSQL database (rebuilt from db/init/*.sql at the
start of every run) and a fake S3 server (moto), so they never touch real data or real
cloud storage.

Needs a running PostgreSQL server that allows creating databases. By default:
    postgresql://northshelf:northshelf_dev@localhost:5432/northshelf_test
Override with TEST_DATABASE_URL. The database name must end in "_test"; this is checked so
the suite can never wipe a real database.
"""
import io
import os
import socket
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import psycopg
import pytest

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://northshelf:northshelf_dev@localhost:5432/northshelf_test"
).replace("postgresql+psycopg://", "postgresql://")
DB_NAME = urlparse(TEST_DB_URL).path.lstrip("/")
if not DB_NAME.endswith("_test"):
    raise RuntimeError(f"Refusing to run tests: database name '{DB_NAME}' must end in '_test'")

# Must be set before the app is imported, because the app opens its engine at import time.
os.environ["DATABASE_URL"] = TEST_DB_URL.replace("postgresql://", "postgresql+psycopg://", 1)
os.environ["APP_ENV"] = "development"

from fastapi.testclient import TestClient  # noqa: E402

from app import storage  # noqa: E402
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.ratelimit import limiter  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BUCKET = "northshelf-test"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session", autouse=True)
def database():
    """Create a fresh test database from the same SQL files a real install uses."""
    parsed = urlparse(TEST_DB_URL)
    admin_url = urlunparse(parsed._replace(path="/postgres"))
    with psycopg.connect(admin_url, autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{DB_NAME}" WITH (FORCE)')
        admin.execute(f'CREATE DATABASE "{DB_NAME}"')
    with psycopg.connect(TEST_DB_URL, autocommit=True) as conn:
        for sql_file in sorted((ROOT / "db" / "init").glob("*.sql")):
            conn.execute(sql_file.read_text())
        seed_courses = conn.execute("SELECT max(id) FROM courses").fetchone()[0]
        seed_institutions = conn.execute("SELECT max(id) FROM institutions").fetchone()[0]
    yield {"courses": seed_courses, "institutions": seed_institutions}


@pytest.fixture(scope="session", autouse=True)
def s3(database):
    """A fake S3 service, used through the same code path as Cloudflare R2."""
    import boto3
    from moto.server import ThreadedMotoServer

    port = _free_port()
    server = ThreadedMotoServer(ip_address="127.0.0.1", port=port, verbose=False)
    server.start()
    endpoint = f"http://127.0.0.1:{port}"
    client = boto3.client(
        "s3", endpoint_url=endpoint, aws_access_key_id="test", aws_secret_access_key="test",
        region_name="us-east-1",
    )
    client.create_bucket(Bucket=BUCKET)

    settings.s3_endpoint_url = endpoint
    settings.s3_access_key_id = "test"
    settings.s3_secret_access_key = "test"
    settings.s3_bucket = BUCKET
    settings.s3_region = "us-east-1"
    storage._client.cache_clear()
    yield client
    server.stop()


@pytest.fixture
def db():
    """Run SQL against the test database. Returns rows for SELECT statements."""

    def run(query: str, *params):
        with psycopg.connect(TEST_DB_URL, autocommit=True) as conn:
            cur = conn.execute(query, params) if params else conn.execute(query)
            return cur.fetchall() if cur.description else None

    return run


@pytest.fixture(autouse=True)
def clean(database, s3, db):
    """Every test starts from the freshly seeded state."""
    db("TRUNCATE materials, votes, reports, password_resets, users RESTART IDENTITY CASCADE")
    db("DELETE FROM course_equivalencies")
    db(f"DELETE FROM courses WHERE id > {database['courses']}")
    db(f"DELETE FROM institutions WHERE id > {database['institutions']}")
    limiter.reset()
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET):
        for obj in page.get("Contents", []):
            s3.delete_object(Bucket=BUCKET, Key=obj["Key"])
    yield


@pytest.fixture
def stored_keys(s3):
    def keys() -> set[str]:
        out = set()
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix="materials/"):
            out.update(o["Key"] for o in page.get("Contents", []))
        return out

    return keys


@pytest.fixture
def anon():
    return TestClient(app)


@pytest.fixture
def make_user(db):
    """Create a signed-in user (their own client keeps the session cookie)."""

    def _make(name: str = "Student", role: str | None = None, password: str = "password123") -> TestClient:
        email = f"{name.lower().replace(' ', '.')}@example.com"
        client = TestClient(app)
        r = client.post("/api/auth/signup", json={"email": email, "password": password, "display_name": name})
        assert r.status_code == 201, r.text
        if role:
            db("UPDATE users SET role = %s WHERE email = %s", role, email)
        client.email = email  # type: ignore[attr-defined]
        client.password = password  # type: ignore[attr-defined]
        return client

    return _make


@pytest.fixture
def course_id(database, db):
    return db("SELECT id FROM courses WHERE code = 'MHF4U'")[0][0]


def make_pdf(n: int = 0, size: int = 2000) -> bytes:
    """A tiny fake PDF. Different n gives different bytes (so it isn't a duplicate)."""
    return b"%PDF-1.4 " + str(n).encode() + b" " * size


@pytest.fixture
def upload(course_id):
    def _upload(client, n: int = 0, size: int = 2000, data: bytes | None = None, **fields):
        form = {
            "course_id": str(course_id),
            "material_type": "past_exam",
            "title": f"Test upload {n}",
            "license": "own-work",
            "own_work_confirmed": "true",
        }
        form.update(fields)
        payload = make_pdf(n, size) if data is None else data
        return client.post(
            "/api/materials", data=form, files={"file": ("file.pdf", io.BytesIO(payload), "application/octet-stream")}
        )

    return _upload


@pytest.fixture
def outbox(monkeypatch):
    """Captures password reset emails instead of sending them."""
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr("app.mailer.send_password_reset", lambda to, link: sent.append((to, link)))
    return sent
