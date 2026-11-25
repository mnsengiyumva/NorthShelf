"""Database backups stored in the same R2 bucket under backups/ (cleanup only touches materials/).

Usage (see scripts/backup.sh):
    ... | python -m app.backup upload      read a gzipped SQL dump on stdin and store it
    python -m app.backup list              show stored backups, newest first
    python -m app.backup fetch <key>       write a stored backup to stdout
    python -m app.backup prune [--keep N]  delete all but the newest N (default 30)
"""
import argparse
import sys
from datetime import datetime, timezone

from . import storage

PREFIX = "backups/"
DEFAULT_KEEP = 30


def make_key(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return f"{PREFIX}db-{now:%Y-%m-%d-%H%M%S}.sql.gz"


def upload(data: bytes, now: datetime | None = None) -> str:
    if len(data) < 100:
        raise ValueError("Refusing to store an empty or truncated backup")
    key = make_key(now)
    storage.put_object(key, data, "application/gzip")
    return key


def list_backups() -> list[str]:
    """Stored backup keys, newest first (names sort by date)."""
    return sorted((k for k, _ in storage.iter_objects(PREFIX)), reverse=True)


def prune(keep: int = DEFAULT_KEEP) -> list[str]:
    old = list_backups()[keep:]
    for key in old:
        storage.delete_object(key)
    return old


def fetch(key: str) -> bytes:
    if not key.startswith(PREFIX):
        raise ValueError("Not a backup key")
    return storage._client().get_object(Bucket=storage.settings.s3_bucket, Key=key)["Body"].read()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="app.backup")
    sub = ap.add_subparsers(dest="cmd", required=True)
    up = sub.add_parser("upload")
    up.add_argument("--keep", type=int, default=DEFAULT_KEEP)
    sub.add_parser("list")
    f = sub.add_parser("fetch")
    f.add_argument("key")
    p = sub.add_parser("prune")
    p.add_argument("--keep", type=int, default=DEFAULT_KEEP)
    args = ap.parse_args(argv)

    if not storage.is_configured():
        print("File storage is not configured", file=sys.stderr)
        return 1
    if args.cmd == "upload":
        key = upload(sys.stdin.buffer.read())
        removed = prune(args.keep)
        print(f"stored {key}; removed {len(removed)} old backup(s)")
    elif args.cmd == "list":
        print("\n".join(list_backups()))
    elif args.cmd == "fetch":
        sys.stdout.buffer.write(fetch(args.key))
    elif args.cmd == "prune":
        print(f"removed {len(prune(args.keep))} old backup(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
