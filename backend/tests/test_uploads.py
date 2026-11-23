"""Uploading, reviewing, downloading and deleting materials."""
import requests

from app import storage
from app.config import settings
from tests.conftest import make_pdf


def test_uploading_requires_login(anon, upload):
    assert upload(anon).status_code == 401


def test_own_work_confirmation_is_required(make_user, upload):
    assert upload(make_user("Sam"), own_work_confirmed="false").status_code == 400


def test_file_must_really_be_a_pdf_png_or_jpeg(make_user, upload):
    sam = make_user("Sam")
    assert upload(sam, data=b"MZ\x90\x00 an executable pretending to be a pdf").status_code == 415
    assert upload(sam, data=b"").status_code == 400
    assert upload(sam, data=b"\x89PNG\r\n\x1a\n" + b"x" * 100).status_code == 201
    assert upload(sam, data=b"\xff\xd8\xff\xe0" + b"y" * 100).status_code == 201


def test_size_limit(make_user, upload, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    r = upload(make_user("Sam"), data=b"%PDF-" + b"0" * (1024 * 1024 + 10))
    assert r.status_code == 413


def test_unknown_course_type_license_and_bad_fields(make_user, upload):
    sam = make_user("Sam")
    assert upload(sam, course_id="999999").status_code == 400
    assert upload(sam, material_type="nope").status_code == 400
    assert upload(sam, license="nope").status_code == 400
    assert upload(sam, title="ab").status_code == 422
    assert upload(sam, language="de").status_code == 422


def test_new_uploads_wait_for_review(make_user, upload, anon, stored_keys, db):
    sam = make_user("Sam")
    r = upload(sam)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert len(stored_keys()) == 1
    assert anon.get("/api/materials").json() == []           # hidden from the public
    mine = sam.get("/api/my/materials").json()
    assert [m["status"] for m in mine] == ["pending"]
    assert db("SELECT mime_type, file_size FROM materials")[0][0] == "application/pdf"


def test_pending_files_are_only_visible_to_owner_and_moderators(make_user, upload, anon):
    sam = make_user("Sam")
    mid = upload(sam).json()["id"]
    assert sam.get(f"/api/materials/{mid}/download", follow_redirects=False).status_code == 302
    assert make_user("Mod", role="moderator").get(f"/api/materials/{mid}/download", follow_redirects=False).status_code == 302
    assert anon.get(f"/api/materials/{mid}/download", follow_redirects=False).status_code == 404
    assert make_user("Other").get(f"/api/materials/{mid}/download", follow_redirects=False).status_code == 404


def test_review_publish_and_download(make_user, upload, anon, db):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    mid = upload(sam, n=7).json()["id"]

    assert mod.post(f"/api/admin/materials/{mid}/approve").json()["status"] == "published"
    listed = anon.get("/api/materials").json()
    assert [m["id"] for m in listed] == [mid] and listed[0]["uploader"] == "Sam"
    assert anon.get(f"/api/materials/{mid}").status_code == 200

    redirect = anon.get(f"/api/materials/{mid}/download", follow_redirects=False)
    assert redirect.status_code == 302
    stored = requests.get(redirect.headers["location"], timeout=10)
    assert stored.status_code == 200
    assert stored.content == make_pdf(7)
    assert 'attachment; filename="Test_upload_7.pdf"' == stored.headers["content-disposition"]
    assert db("SELECT download_count FROM materials")[0][0] == 1


def test_approving_twice_fails(make_user, upload):
    mid = upload(make_user("Sam")).json()["id"]
    mod = make_user("Mod", role="moderator")
    assert mod.post(f"/api/admin/materials/{mid}/approve").status_code == 200
    assert mod.post(f"/api/admin/materials/{mid}/approve").status_code == 404


def test_duplicate_files_are_blocked_even_across_users(make_user, upload):
    assert upload(make_user("Sam"), n=1).status_code == 201
    r = upload(make_user("Alex"), n=1, title="Same file, different title")
    assert r.status_code == 409 and "already been uploaded" in r.json()["detail"]


def test_rejecting_deletes_the_stored_file(make_user, upload, stored_keys, anon, db):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    mid = upload(sam, n=5).json()["id"]
    assert len(stored_keys()) == 1

    assert mod.post(f"/api/admin/materials/{mid}/reject").status_code == 200
    assert stored_keys() == set()
    assert db("SELECT status FROM materials")[0][0] == "removed"
    assert sam.get(f"/api/materials/{mid}/download", follow_redirects=False).status_code == 404
    assert upload(sam, n=5).status_code == 201          # the same file may be uploaded again


def test_uploaders_can_delete_their_own_material(make_user, upload, stored_keys):
    sam = make_user("Sam")
    mid = upload(sam).json()["id"]
    assert make_user("Other").delete(f"/api/my/materials/{mid}").status_code == 404
    assert len(stored_keys()) == 1
    assert sam.delete(f"/api/my/materials/{mid}").status_code == 204
    assert stored_keys() == set()
    assert sam.delete(f"/api/my/materials/{mid}").status_code == 404


def test_storage_failures_leave_no_database_row(make_user, upload, db, monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("storage is down")

    monkeypatch.setattr("app.storage.put_object", broken)
    r = upload(make_user("Sam"))
    assert r.status_code == 502
    assert db("SELECT count(*) FROM materials")[0][0] == 0


def test_storage_not_configured_gives_a_clear_error(make_user, upload, monkeypatch):
    sam = make_user("Sam")
    monkeypatch.setattr(settings, "s3_bucket", "")
    storage._client.cache_clear()              # the storage client is cached after first use
    try:
        r = upload(sam)
    finally:
        storage._client.cache_clear()
    assert r.status_code == 503 and "not set up" in r.json()["detail"]


def test_public_listing_filters(make_user, upload, anon, course_id):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    a = upload(sam, n=1, title="Final exam", academic_year="2024").json()["id"]
    b = upload(sam, n=2, title="Class notes", material_type="notes", academic_year="2023").json()["id"]
    for mid in (a, b):
        mod.post(f"/api/admin/materials/{mid}/approve")

    assert len(anon.get("/api/materials", params={"course_id": course_id}).json()) == 2
    assert [m["id"] for m in anon.get("/api/materials", params={"type": "notes"}).json()] == [b]
    assert [m["id"] for m in anon.get("/api/materials", params={"year": 2024}).json()] == [a]
    assert [m["id"] for m in anon.get("/api/materials", params={"q": "final"}).json()] == [a]
