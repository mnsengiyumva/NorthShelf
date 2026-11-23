"""Proposing missing courses and schools."""
HS = {"level": "high_school", "region": "CA-ON", "code": "TST4U", "title": "Test Course Four",
      "subject": "mathematics", "grade": 12}


def test_login_required(anon):
    assert anon.post("/api/courses", json=HS).status_code == 401


def test_new_high_school_course_starts_pending(make_user, anon):
    sam = make_user("Sam")
    r = sam.post("/api/courses", json=HS)
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending" and body["existing"] is False and body["level"] == "high_school"
    assert anon.get(f"/api/courses/{body['id']}").status_code == 404                    # not public yet
    assert body["id"] not in [c["id"] for c in anon.get("/api/courses", params={"q": "TST4U"}).json()]


def test_duplicates_return_the_existing_course(make_user):
    sam = make_user("Sam")
    first = sam.post("/api/courses", json=HS).json()
    again = sam.post("/api/courses", json={**HS, "code": "tst4u", "title": "Another title"})
    assert again.status_code == 200 and again.json()["id"] == first["id"] and again.json()["existing"] is True
    seeded = sam.post("/api/courses", json={**HS, "code": "MHF4U"}).json()               # a seeded course
    assert seeded["existing"] is True and seeded["status"] == "approved"


def test_high_school_courses_take_no_school(make_user):
    r = make_user("Sam").post("/api/courses", json={**HS, "new_institution_name": "Some School"})
    assert r.status_code == 400


def test_college_and_university_courses_need_exactly_one_school_field(make_user, db):
    sam = make_user("Sam")
    base = {"level": "university", "region": "CA-PE", "code": "CSCI 9999", "title": "Test University Course"}
    assert sam.post("/api/courses", json=base).status_code == 400
    both = {**base, "institution_id": 1, "new_institution_name": "Test School"}
    assert sam.post("/api/courses", json=both).status_code == 400
    upei = db("SELECT id FROM institutions WHERE name = 'University of Prince Edward Island'")[0][0]
    assert sam.post("/api/courses", json={**base, "region": "CA-ON", "institution_id": upei}).status_code == 400
    ok = sam.post("/api/courses", json={**base, "institution_id": upei})
    assert ok.status_code == 201 and ok.json()["institution"] == "University of Prince Edward Island"


def test_new_schools_are_pending_normalised_and_reused(make_user, anon, db):
    sam = make_user("Sam")
    base = {"level": "college", "region": "CA-NS", "title": "Test College Course"}
    sam.post("/api/courses", json={**base, "code": "TST 101", "new_institution_name": "Test  College of  Testing"})
    sam.post("/api/courses", json={**base, "code": "TST 102", "new_institution_name": "test college of testing"})
    rows = db("SELECT name, status FROM institutions WHERE name ILIKE 'test college%'")
    assert rows == [("Test College of Testing", "pending")]
    listed = [i["name"] for i in anon.get("/api/institutions", params={"region": "CA-NS"}).json()]
    assert "Test College of Testing" not in listed


def test_input_validation(make_user):
    sam = make_user("Sam")
    assert sam.post("/api/courses", json={**HS, "code": "<script>"}).status_code == 422
    assert sam.post("/api/courses", json={**HS, "grade": 13}).status_code == 422
    assert sam.post("/api/courses", json={**HS, "region": "CA-XX"}).status_code == 400
    assert sam.post("/api/courses", json={**HS, "subject": "underwater-basketry"}).status_code == 400


def test_limit_of_five_pending_courses(make_user):
    sam = make_user("Sam")
    for n in range(5):
        assert sam.post("/api/courses", json={**HS, "code": f"TST{n}U"}).status_code == 201
    r = sam.post("/api/courses", json={**HS, "code": "TST9U"})
    assert r.status_code == 429


def test_moderator_courses_are_approved_immediately(make_user, anon):
    r = make_user("Mod", role="moderator").post("/api/courses", json=HS)
    assert r.json()["status"] == "approved"
    assert anon.get(f"/api/courses/{r.json()['id']}").status_code == 200


def test_approving_an_upload_publishes_its_new_course_and_school(make_user, upload, anon, db):
    sam = make_user("Sam")
    mod = make_user("Mod", role="moderator")
    course = sam.post("/api/courses", json={
        "level": "college", "region": "CA-NS", "code": "TST 101", "title": "Test College Course",
        "new_institution_name": "Test College of Testing"}).json()
    review = upload(sam, course_id=str(course["id"]))
    assert review.status_code == 201                       # uploads to pending courses are allowed

    queued = [m for m in mod.get("/api/admin/materials").json() if m["id"] == review.json()["id"]][0]
    assert queued["course_status"] == "pending" and queued["institution"] == "Test College of Testing"

    mod.post(f"/api/admin/materials/{review.json()['id']}/approve")
    assert anon.get(f"/api/courses/{course['id']}").status_code == 200
    assert db("SELECT status FROM institutions WHERE name = 'Test College of Testing'")[0][0] == "approved"
    assert "Test College of Testing" in [i["name"] for i in anon.get("/api/institutions", params={"region": "CA-NS"}).json()]
