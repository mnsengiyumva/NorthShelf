# NorthShelf

Free, student-shared course materials for Canadian high school, college and university students,
filterable by province, level, course and language.

## Stack
- **Backend:** FastAPI (Python) + SQLAlchemy Core
- **Database:** PostgreSQL 16 (schema in `db/init/01_schema.sql`, seed data in `db/init/02_seed.sql`)
- **File storage:** S3-compatible object storage (to be chosen when we build uploads; Cloudflare R2 is the leading option)
- **Frontend:** React + Vite + Tailwind (to be added in `frontend/`)

## Run it
1. Install Docker Desktop.
2. `cp .env.example .env`
3. `docker compose up --build`
4. Open:
   - API docs: http://localhost:8000/docs
   - Health check: http://localhost:8000/health
   - Try: http://localhost:8000/api/regions?type=province
   - Try: http://localhost:8000/api/courses?region=CA-ON&level=high_school

## Resetting the database
The SQL files in `db/init/` only run when the database volume is first created. After editing them:

    docker compose down -v && docker compose up --build

## Roadmap
1. [x] Repo, Docker Compose, schema, seed data, read-only catalog API
2. [ ] Frontend scaffold (Vite + React + Tailwind) with browse/filter page
3. [ ] Auth (signup/login)
4. [ ] Upload flow: presigned URL -> storage -> pending -> moderator approval
5. [ ] Material pages, download, search
6. [ ] Reports, votes, moderation queue
7. [ ] i18n (EN/FR), accessibility pass, deployment
