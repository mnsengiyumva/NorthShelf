"""The cleanup script removes unused files and stale pending courses."""
from app import cleanup


def test_dry_run_lists_but_deletes_nothing(s3, stored_keys, capsys):
    s3.put_object(Bucket="northshelf-test", Key="materials/orphan.pdf", Body=b"%PDF-1.4 orphan")
    cleanup.main(["--min-age-minutes", "0"])
    out = capsys.readouterr().out
    assert "would delete materials/orphan.pdf" in out
    assert "materials/orphan.pdf" in stored_keys()


def test_delete_removes_orphans_but_keeps_files_in_use(make_user, upload, s3, stored_keys):
    mid_owner = make_user("Sam")
    upload(mid_owner, n=1)
    kept = stored_keys()
    s3.put_object(Bucket="northshelf-test", Key="materials/orphan.pdf", Body=b"%PDF-1.4 orphan")

    cleanup.main(["--min-age-minutes", "0", "--delete"])
    assert stored_keys() == kept


def test_fresh_files_are_left_alone(s3, stored_keys):
    s3.put_object(Bucket="northshelf-test", Key="materials/in-flight.pdf", Body=b"%PDF-1.4 x")
    cleanup.main(["--delete"])                      # default minimum age is 60 minutes
    assert "materials/in-flight.pdf" in stored_keys()


def test_stale_pending_courses_and_unused_schools_are_removed(make_user, db):
    sam = make_user("Sam")
    sam.post("/api/courses", json={"level": "college", "region": "CA-NS", "code": "TST 101",
                                   "title": "Test College Course", "new_institution_name": "Test College of Testing"})
    sam.post("/api/courses", json={"level": "high_school", "region": "CA-ON", "code": "NEW4U", "title": "Recent Course"})
    db("UPDATE courses SET created_at = now() - interval '10 days' WHERE code = 'TST 101'")

    cleanup.main(["--min-age-minutes", "0", "--delete"])
    assert db("SELECT count(*) FROM courses WHERE code = 'TST 101'")[0][0] == 0
    assert db("SELECT count(*) FROM institutions WHERE name = 'Test College of Testing'")[0][0] == 0
    assert db("SELECT count(*) FROM courses WHERE code = 'NEW4U'")[0][0] == 1       # too recent to remove


def test_expired_reset_tokens_are_removed(make_user, anon, db, outbox):
    make_user("Sam")
    anon.post("/api/auth/forgot-password", json={"email": "sam@example.com"})
    db("UPDATE password_resets SET expires_at = now() - interval '3 days'")
    cleanup.main(["--min-age-minutes", "0", "--delete"])
    assert db("SELECT count(*) FROM password_resets")[0][0] == 0


def test_backups_are_stored_listed_pruned_and_fetched(s3):
    from datetime import datetime, timezone

    from app import backup

    data = b"x" * 500
    keys = [
        backup.upload(data, datetime(2026, 11, d, 3, 0, tzinfo=timezone.utc)) for d in (1, 2, 3)
    ]
    assert backup.list_backups() == sorted(keys, reverse=True)
    assert backup.fetch(keys[0]) == data
    assert backup.prune(keep=2) == [keys[0]]
    assert backup.list_backups() == [keys[2], keys[1]]


def test_backup_refuses_empty_dump_and_cleanup_leaves_backups_alone(s3, db):
    import pytest

    from app import backup, cleanup

    with pytest.raises(ValueError):
        backup.upload(b"")
    key = backup.upload(b"y" * 500)
    cleanup.main(["--delete"])
    assert key in backup.list_backups()
