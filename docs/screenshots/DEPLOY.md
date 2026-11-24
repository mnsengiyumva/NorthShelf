# Deploying NorthShelf (single VPS + Docker + Caddy)

1. DNS: `A` records for `northshelf.tech` and `www` pointing to the server IP.
2. Server: Ubuntu 24.04, firewall allowing 22, 80, 443; Docker installed.
3. `git clone` the repo, copy `.env.production.example` to `.env`, fill it in.
4. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
5. Create your account on the site, then promote it:
   `docker compose -f docker-compose.prod.yml exec db psql -U northshelf -d northshelf -c "UPDATE users SET role='admin' WHERE email='you@example.com';"`

Update later: `git pull` then repeat step 4.
