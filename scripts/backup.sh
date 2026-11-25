#!/usr/bin/env bash
# Dump the database, compress it and store it in R2 (backups/ prefix). Run from cron.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
C="docker compose -f docker-compose.prod.yml --env-file .env"

$C exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner \
  | gzip \
  | $C exec -T backend python -m app.backup upload
