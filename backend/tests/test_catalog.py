"""Read-only catalog endpoints: regions, levels, courses, institutions."""


def test_health(anon):
    r = anon.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_root_points_to_docs(anon):
    assert anon.get("/").json()["docs"] == "/docs"


def test_regions_cover_all_provinces_and_territories(anon):
    provinces = anon.get("/api/regions", params={"type": "province"}).json()
    territories = anon.get("/api/regions", params={"type": "territory"}).json()
    assert len(provinces) == 10 and len(territories) == 3
    assert all(r["parent_code"] == "CA" for r in provinces + territories)
    assert {"CA-ON", "CA-PE", "CA-QC"} <= {r["code"] for r in provinces}


def test_lookup_lists_are_seeded(anon):
    assert [x["slug"] for x in anon.get("/api/levels").json()] == ["high_school", "college", "university"]
    assert len(anon.get("/api/subjects").json()) >= 5
    assert "past_exam" in [x["slug"] for x in anon.get("/api/material-types").json()]
    assert "own-work" in [x["slug"] for x in anon.get("/api/licenses").json()]


def test_courses_filter_by_region_level_and_search(anon):
    ontario = anon.get("/api/courses", params={"region": "CA-ON", "level": "high_school"}).json()
    assert len(ontario) == 6 and all(c["region_code"] == "CA-ON" for c in ontario)
    alberta = anon.get("/api/courses", params={"region": "CA-AB"}).json()
    assert [c["code"] for c in alberta] == ["Math 30-1"]
    assert [c["code"] for c in anon.get("/api/courses", params={"q": "calc"}).json()] == ["MCV4U"]
    assert [c["code"] for c in anon.get("/api/courses", params={"q": "sph4"}).json()] == ["SPH4U"]
    assert anon.get("/api/courses", params={"region": "CA-NU"}).json() == []


def test_courses_pagination(anon):
    first = anon.get("/api/courses", params={"limit": 3}).json()
    rest = anon.get("/api/courses", params={"limit": 3, "offset": 3}).json()
    assert len(first) == 3 and len(rest) == 3
    assert not {c["id"] for c in first} & {c["id"] for c in rest}
    assert anon.get("/api/courses", params={"limit": 0}).status_code == 422


def test_course_detail_and_404(anon, course_id):
    r = anon.get(f"/api/courses/{course_id}")
    assert r.status_code == 200 and r.json()["code"] == "MHF4U"
    assert anon.get("/api/courses/999999").status_code == 404


def test_institutions_are_filterable(anon):
    pei = anon.get("/api/institutions", params={"region": "CA-PE"}).json()
    names = {i["name"] for i in pei}
    assert {"University of Prince Edward Island", "Holland College"} <= names
    assert all(i["region_code"] == "CA-PE" for i in pei)
    only_colleges = anon.get("/api/institutions", params={"region": "CA-PE", "level": "college"}).json()
    assert [i["name"] for i in only_colleges] == ["Holland College"]


def test_materials_list_starts_empty(anon):
    assert anon.get("/api/materials").json() == []
    assert anon.get("/api/materials/not-a-uuid").status_code == 422


def test_robots_txt_hides_private_pages_and_points_to_sitemap(anon):
    r = anon.get("/robots.txt")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/plain")
    assert "Disallow: /admin" in r.text and "Disallow: /api/" in r.text
    assert "Sitemap: http://localhost:5173/sitemap.xml" in r.text


def test_sitemap_lists_only_courses_with_published_materials(anon, make_user, upload, course_id):
    xml = anon.get("/sitemap.xml")
    assert xml.status_code == 200 and xml.headers["content-type"].startswith("application/xml")
    assert "<loc>http://localhost:5173/browse</loc>" in xml.text
    assert f"/courses/{course_id}<" not in xml.text      # no materials yet

    student, mod = make_user("Student"), make_user("Mod", role="moderator")
    material_id = upload(student).json()["id"]
    assert f"/courses/{course_id}<" not in anon.get("/sitemap.xml").text   # still pending
    assert mod.post(f"/api/admin/materials/{material_id}/approve").status_code == 200
    assert f"<loc>http://localhost:5173/courses/{course_id}</loc>" in anon.get("/sitemap.xml").text
