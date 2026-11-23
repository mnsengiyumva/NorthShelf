"""Signup, login, logout, sessions and brute-force protection."""
from fastapi.testclient import TestClient

from app.main import app

GOOD = {"email": "sam@example.com", "password": "correct horse", "display_name": "Sam"}


def test_signup_logs_you_in_with_a_safe_cookie(anon):
    r = anon.post("/api/auth/signup", json=GOOD)
    assert r.status_code == 201
    assert r.json()["email"] == "sam@example.com" and "password" not in r.text
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert anon.get("/api/auth/me").json()["display_name"] == "Sam"


def test_signup_validation(anon):
    assert anon.post("/api/auth/signup", json={**GOOD, "password": "short"}).status_code == 422
    assert anon.post("/api/auth/signup", json={**GOOD, "email": "not-an-email"}).status_code == 422
    assert anon.post("/api/auth/signup", json={**GOOD, "display_name": "x"}).status_code == 422


def test_email_is_case_insensitive_and_unique(anon):
    anon.post("/api/auth/signup", json={**GOOD, "email": "Sam@Example.com"})
    r = TestClient(app).post("/api/auth/signup", json={**GOOD, "email": "sam@example.COM"})
    assert r.status_code == 409


def test_me_requires_login(anon):
    assert anon.get("/api/auth/me").status_code == 401


def test_logout_ends_the_session(make_user):
    c = make_user("Sam")
    assert c.get("/api/auth/me").status_code == 200
    assert c.post("/api/auth/logout").status_code == 204
    assert c.get("/api/auth/me").status_code == 401


def test_login_works_and_is_case_insensitive(make_user):
    make_user("Sam")
    fresh = TestClient(app)
    assert fresh.post("/api/auth/login", json={"email": "SAM@example.com", "password": "password123"}).status_code == 200
    assert fresh.get("/api/auth/me").status_code == 200


def test_wrong_password_and_unknown_email_look_the_same(make_user, anon):
    make_user("Sam")
    wrong = anon.post("/api/auth/login", json={"email": "sam@example.com", "password": "nope-nope"})
    unknown = anon.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_account_without_a_password_cannot_log_in(db, anon):
    db("INSERT INTO users (email, display_name) VALUES ('legacy@example.com', 'Legacy')")
    r = anon.post("/api/auth/login", json={"email": "legacy@example.com", "password": "anything123"})
    assert r.status_code == 401


def test_tampered_session_cookie_is_ignored(anon):
    anon.cookies.set("northshelf_session", "garbage.token.value")
    assert anon.get("/api/auth/me").status_code == 401


def test_five_failed_logins_lock_the_account_for_a_while(make_user):
    make_user("Sam")
    codes = [
        TestClient(app).post("/api/auth/login", json={"email": "sam@example.com", "password": f"wrong-{n}-pass"}).status_code
        for n in range(5)
    ]
    assert codes == [401] * 5
    locked = TestClient(app).post("/api/auth/login", json={"email": "sam@example.com", "password": "password123"})
    assert locked.status_code == 429 and "Retry-After" in locked.headers


def test_lockout_is_per_account(make_user):
    make_user("Sam")
    make_user("Alex")
    for n in range(5):
        TestClient(app).post("/api/auth/login", json={"email": "sam@example.com", "password": f"wrong-{n}-pass"})
    ok = TestClient(app).post("/api/auth/login", json={"email": "alex@example.com", "password": "password123"})
    assert ok.status_code == 200


def test_per_ip_login_limit(anon):
    codes = [
        anon.post("/api/auth/login", json={"email": f"nobody{n}@example.com", "password": "whatever123"}).status_code
        for n in range(61)
    ]
    assert codes[59] == 401 and codes[60] == 429


def test_per_ip_signup_limit(anon):
    codes = [
        TestClient(app).post(
            "/api/auth/signup", json={"email": f"s{n}@example.com", "password": "password123", "display_name": f"S{n}"}
        ).status_code
        for n in range(21)
    ]
    assert codes[:20] == [201] * 20 and codes[20] == 429
