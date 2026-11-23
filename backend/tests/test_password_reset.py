"""Forgot-password and reset-password."""
import time

from fastapi.testclient import TestClient

from app.main import app


def token_from(link: str) -> str:
    return link.split("token=")[1]


def test_unknown_email_gets_the_same_answer_and_no_email(anon, outbox):
    r = anon.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert r.status_code == 202 and "If an account exists" in r.json()["detail"]
    assert outbox == []


def test_known_email_gets_a_link(make_user, anon, outbox):
    make_user("Sam")
    r = anon.post("/api/auth/forgot-password", json={"email": "SAM@example.com"})
    assert r.status_code == 202
    assert len(outbox) == 1
    to, link = outbox[0]
    assert to == "sam@example.com"
    assert link.startswith("http://localhost:5173/reset-password?token=")


def test_reset_changes_the_password(make_user, anon, outbox):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    token = token_from(outbox[0][1])

    r = anon.post("/api/auth/reset-password", json={"token": token, "password": "brand new pass"})
    assert r.status_code == 200

    other = TestClient(app)
    assert other.post("/api/auth/login", json={"email": "sam@example.com", "password": "password123"}).status_code == 401
    assert other.post("/api/auth/login", json={"email": "sam@example.com", "password": "brand new pass"}).status_code == 200


def test_a_link_works_only_once(make_user, anon, outbox):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    token = token_from(outbox[0][1])
    assert anon.post("/api/auth/reset-password", json={"token": token, "password": "first new pass"}).status_code == 200
    again = anon.post("/api/auth/reset-password", json={"token": token, "password": "second new pass"})
    assert again.status_code == 400


def test_only_the_newest_link_works(make_user, anon, outbox):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    old, new = (token_from(link) for _, link in outbox)
    assert anon.post("/api/auth/reset-password", json={"token": old, "password": "whatever pass"}).status_code == 400
    assert anon.post("/api/auth/reset-password", json={"token": new, "password": "whatever pass"}).status_code == 200


def test_expired_link_is_rejected(make_user, anon, outbox, db):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    token = token_from(outbox[0][1])
    db("UPDATE password_resets SET expires_at = now() - interval '1 minute'")
    r = anon.post("/api/auth/reset-password", json={"token": token, "password": "brand new pass"})
    assert r.status_code == 400 and "invalid or has expired" in r.json()["detail"]


def test_garbage_and_weak_inputs(anon):
    assert anon.post("/api/auth/reset-password", json={"token": "x" * 40, "password": "brand new pass"}).status_code == 400
    assert anon.post("/api/auth/reset-password", json={"token": "short", "password": "brand new pass"}).status_code == 422
    assert anon.post("/api/auth/reset-password", json={"token": "x" * 40, "password": "short"}).status_code == 422


def test_only_a_hash_of_the_token_is_stored(make_user, anon, outbox, db):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    token = token_from(outbox[0][1])
    stored = db("SELECT token_hash FROM password_resets")[0][0]
    assert stored != token and token not in stored and len(stored) == 64


def test_reset_signs_out_existing_sessions(make_user, anon, outbox):
    logged_in = make_user("Sam")
    assert logged_in.get("/api/auth/me").status_code == 200
    time.sleep(1.1)  # session times have one-second precision
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    anon.post("/api/auth/reset-password", json={"token": token_from(outbox[0][1]), "password": "brand new pass"})
    assert logged_in.get("/api/auth/me").status_code == 401

    fresh = TestClient(app)
    fresh.post("/api/auth/login", json={"email": "sam@example.com", "password": "brand new pass"})
    assert fresh.get("/api/auth/me").status_code == 200


def test_accounts_without_a_password_can_set_one(db, anon, outbox):
    db("INSERT INTO users (email, display_name) VALUES ('legacy@example.com', 'Legacy')")
    anon.post("/api/auth/forgot-password", json={"email": "legacy@example.com"})
    anon.post("/api/auth/reset-password", json={"token": token_from(outbox[0][1]), "password": "a fresh password"})
    ok = TestClient(app).post("/api/auth/login", json={"email": "legacy@example.com", "password": "a fresh password"})
    assert ok.status_code == 200


def test_requests_are_rate_limited_per_email_and_per_ip(make_user, anon, outbox):
    make_user("Sam")
    codes = [anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"}).status_code for _ in range(4)]
    assert codes == [202, 202, 202, 429]

    codes = [
        anon.post("/api/auth/forgot-password", json={"email": f"other{n}@example.com"}).status_code for n in range(8)
    ]
    assert codes[-1] == 429  # 10 requests per hour from one address in total
