"""Moderator-only endpoints."""


def test_admin_endpoints_need_a_moderator(anon, make_user):
    assert anon.get("/api/admin/materials").status_code == 401
    assert anon.get("/api/admin/stats").status_code == 401
    student = make_user("Sam")
    assert student.get("/api/admin/materials").status_code == 403
    assert student.get("/api/admin/stats").status_code == 403
    assert student.post("/api/admin/materials/00000000-0000-0000-0000-000000000000/approve").status_code == 403


def test_review_queue_shows_what_a_moderator_needs(make_user, upload):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    upload(sam, n=1, description="Worked solutions")
    item = mod.get("/api/admin/materials").json()[0]
    assert item["uploader"] == "Sam" and item["own_work_confirmed"] is True
    assert item["license"] and item["course_code"] == "MHF4U" and item["region_code"] == "CA-ON"
    assert mod.get("/api/admin/materials", params={"status": "published"}).json() == []


def test_stats_summarise_storage(make_user, upload):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    upload(sam, n=1, size=1000)
    upload(sam, n=2, size=1000)
    mid = upload(sam, n=3, size=1000).json()["id"]
    mod.post(f"/api/admin/materials/{mid}/reject")

    stats = mod.get("/api/admin/stats").json()
    assert stats["by_status"] == {"pending": 2, "removed": 1}
    assert stats["uploads_last_24h"] == 3
    assert 2000 < stats["stored_bytes"] < 2100                 # removed uploads don't count
    assert stats["top_uploaders"][0]["display_name"] == "Sam"
