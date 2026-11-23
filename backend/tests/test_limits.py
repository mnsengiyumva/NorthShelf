"""Per-user upload caps and rate limits."""
from app.config import settings


def test_pending_cap_then_room_after_approval(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_pending_per_user", 3)
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    ids = [upload(sam, n=n).json()["id"] for n in range(3)]
    blocked = upload(sam, n=3)
    assert blocked.status_code == 429 and "waiting for review" in blocked.json()["detail"]

    mod.post(f"/api/admin/materials/{ids[0]}/approve")
    assert upload(sam, n=4).status_code == 201


def test_daily_cap_counts_deleted_uploads_too(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_pending_per_user", 100)
    monkeypatch.setattr(settings, "max_uploads_per_day", 4)
    sam = make_user("Sam")
    for n in range(4):
        mid = upload(sam, n=n).json()["id"]
        sam.delete(f"/api/my/materials/{mid}")            # deleting doesn't give the allowance back
    r = upload(sam, n=99)
    assert r.status_code == 429 and "Daily upload limit" in r.json()["detail"]


def test_storage_allowance(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_user_storage_mb", 1)
    sam = make_user("Sam")
    assert upload(sam, n=1, size=600_000).status_code == 201
    r = upload(sam, n=2, size=600_000)
    assert r.status_code == 429 and "storage allowance" in r.json()["detail"]
    assert upload(make_user("Alex"), n=3, size=600_000).status_code == 201   # per user, not global


def test_deleting_frees_storage_allowance(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_user_storage_mb", 1)
    sam = make_user("Sam")
    mid = upload(sam, n=1, size=600_000).json()["id"]
    sam.delete(f"/api/my/materials/{mid}")
    assert upload(sam, n=2, size=600_000).status_code == 201


def test_moderators_are_exempt(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_pending_per_user", 2)
    mod = make_user("Mod", role="moderator")
    assert [upload(mod, n=n).status_code for n in range(5)] == [201] * 5


def test_hourly_upload_rate_limit(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_pending_per_user", 100)
    monkeypatch.setattr(settings, "max_uploads_per_day", 100)
    sam = make_user("Sam")
    codes = [upload(sam, n=n).status_code for n in range(11)]
    assert codes[:10] == [201] * 10 and codes[10] == 429
