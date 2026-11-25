# Deploying NorthShelf (single VPS + Docker + Caddy)

1. DNS: `A` records for `northshelf.tech` and `www` pointing to the server IP.
2. Server: Ubuntu 24.04, firewall allowing 22, 80, 443; Docker installed.
3. `git clone` the repo, copy `.env.production.example` to `.env`, fill it in.
4. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
5. Create your account on the site, then promote it:
   `docker compose -f docker-compose.prod.yml exec db psql -U northshelf -d northshelf -c "UPDATE users SET role='admin' WHERE email='you@example.com';"`

Update later: `git pull` then repeat step 4.

## Backups
Daily database dumps go to the same R2 bucket under `backups/` (the newest 30 are kept).
Uploaded files already live in R2, so the database is the part that needs backing up.

Test it once: `./scripts/backup.sh` should print `stored backups/db-...sql.gz`.
Schedule it: `crontab -e`, then add
`0 3 * * * /root/northshelf/scripts/backup.sh >> /var/log/northshelf-backup.log 2>&1`

List: `docker compose -f docker-compose.prod.yml exec -T backend python -m app.backup list`

Restore into an EMPTY database (this replaces data, so practice on a test server first):
1. `docker compose -f docker-compose.prod.yml exec -T backend python -m app.backup fetch backups/db-YYYY-MM-DD-HHMMSS.sql.gz | gunzip | docker compose -f docker-compose.prod.yml exec -T db psql -U northshelf -d northshelf`
