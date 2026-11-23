"""Delete stored files that no live material needs (orphans and rejected/deleted uploads),
and pending courses nobody uploaded to within 7 days.

Dry run (shows what would be deleted):   python -m app.cleanup
Actually delete:                          python -m app.cleanup --delete
Only files older than --min-age-minutes (default 60) are touched, so uploads that are
still being saved are never removed.
"""
import argparse
import datetime as dt

from sqlalchemy import text

from . import storage
from .db import engine


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--delete", action="store_true", help="really delete (default is a dry run)")
    parser.add_argument("--min-age-minutes", type=int, default=60)
    args = parser.parse_args(argv)

    with engine.connect() as conn:
        live = {
            r[0]
            for r in conn.execute(text("SELECT file_key FROM materials WHERE status <> 'removed'"))
        }

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=args.min_age_minutes)
    doomed = [key for key, modified in storage.iter_objects("materials/") if key not in live and modified < cutoff]

    stale_courses = (
        "SELECT id FROM courses WHERE status = 'pending' AND created_at < now() - interval '7 days' "
        "AND NOT EXISTS (SELECT 1 FROM materials m WHERE m.course_id = courses.id AND m.status <> 'removed')"
    )
    with engine.connect() as conn:
        n_courses = len(conn.execute(text(stale_courses)).all())
        if args.delete:
            conn.execute(text("DELETE FROM materials WHERE status = 'removed' AND course_id IN (" + stale_courses + ")"))
            conn.execute(text("DELETE FROM courses WHERE id IN (" + stale_courses + ")"))
            conn.execute(text(
                "DELETE FROM institutions WHERE status = 'pending' "
                "AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.institution_id = institutions.id)"
            ))
            conn.execute(text("DELETE FROM password_resets WHERE expires_at < now() - interval '1 day'"))
            conn.commit()
    print(f"{n_courses} stale pending courses {'deleted' if args.delete else 'found'} (older than 7 days, no uploads).")
    print(f"{len(live)} files in use; {len(doomed)} unused files found.")
    for key in doomed:
        if args.delete:
            storage.delete_object(key)
            print("deleted", key)
        else:
            print("would delete", key)
    if doomed and not args.delete:
        print("Dry run only. Re-run with --delete to remove them.")


if __name__ == "__main__":
    main()
