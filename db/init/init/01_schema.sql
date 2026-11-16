-- Student materials platform: starter schema (PostgreSQL)
-- Scope: high school, college, university. Canada first, extensible to other countries.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Regions: country -> province/territory (add states, etc. later)
CREATE TABLE regions (
    id          SERIAL PRIMARY KEY,
    parent_id   INT REFERENCES regions(id),
    type        TEXT NOT NULL CHECK (type IN ('continent', 'country', 'province', 'territory', 'state')),
    code        TEXT NOT NULL,                -- e.g. 'CA', 'CA-ON', 'CA-QC'
    name_en     TEXT NOT NULL,
    name_fr     TEXT,
    UNIQUE (code)
);

-- Education levels (kept as data so you can add elementary, CEGEP, etc. later)
CREATE TABLE education_levels (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,         -- 'high_school', 'college', 'university'
    name_en     TEXT NOT NULL,
    name_fr     TEXT,
    sort_order  INT NOT NULL DEFAULT 0
);

-- Institutions: school boards, high schools, colleges, universities
CREATE TABLE institutions (
    id          SERIAL PRIMARY KEY,
    region_id   INT NOT NULL REFERENCES regions(id),
    parent_id   INT REFERENCES institutions(id),   -- school board -> school
    level_id    INT NOT NULL REFERENCES education_levels(id),
    name        TEXT NOT NULL,
    website     TEXT,
    UNIQUE (region_id, level_id, name)
);

CREATE TABLE subjects (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,         -- 'mathematics', 'physics'
    name_en     TEXT NOT NULL,
    name_fr     TEXT
);

-- Courses:
--   High school courses are standardized per province (region_id set, institution_id NULL),
--   e.g. Ontario MHF4U, Alberta Math 30-1.
--   College/university courses belong to one institution (institution_id set),
--   e.g. code 'CSCI 1010'.
CREATE TABLE courses (
    id                  SERIAL PRIMARY KEY,
    level_id            INT NOT NULL REFERENCES education_levels(id),
    region_id           INT NOT NULL REFERENCES regions(id),
    institution_id      INT REFERENCES institutions(id),
    subject_id          INT REFERENCES subjects(id),
    code                TEXT NOT NULL,
    title               TEXT NOT NULL,
    grade               SMALLINT,                       -- high school only (9-12)
    language            TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged')),
    merged_into_id      INT REFERENCES courses(id),     -- dedupe variants like 'CS1010' vs 'CS 1010'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX courses_unique_idx
    ON courses (level_id, region_id, COALESCE(institution_id, 0), upper(code), language);

-- Optional later: transfer-credit / equivalency mapping between courses
CREATE TABLE course_equivalencies (
    course_id             INT NOT NULL REFERENCES courses(id),
    equivalent_course_id  INT NOT NULL REFERENCES courses(id),
    PRIMARY KEY (course_id, equivalent_course_id),
    CHECK (course_id <> equivalent_course_id)
);

-- Lookup tables instead of hard-coded enums
CREATE TABLE material_types (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,         -- 'past_exam', 'marking_scheme', 'notes', 'study_guide', ...
    name_en     TEXT NOT NULL,
    name_fr     TEXT
);

CREATE TABLE licenses (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,         -- 'cc-by', 'cc-by-nc-sa', 'all-rights-own-work', ...
    name        TEXT NOT NULL,
    url         TEXT
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,              -- avoid real names: many users are minors
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       INT NOT NULL REFERENCES courses(id),
    type_id         INT NOT NULL REFERENCES material_types(id),
    license_id      INT NOT NULL REFERENCES licenses(id),
    uploader_id     UUID NOT NULL REFERENCES users(id),
    title           TEXT NOT NULL,
    description     TEXT,
    academic_year   SMALLINT,                 -- e.g. 2024
    term            TEXT,                     -- 'fall', 'winter', 'summer', 'semester 1'
    language        TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    -- file info (the file itself lives in object storage, never in the DB)
    file_key        TEXT NOT NULL,
    file_hash       TEXT NOT NULL,            -- SHA-256, for duplicate detection
    file_size       BIGINT NOT NULL,
    mime_type       TEXT NOT NULL,
    page_count      INT,
    -- moderation + stats
    own_work_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'published', 'flagged', 'removed')),
    download_count  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    search          TSVECTOR
);

CREATE UNIQUE INDEX materials_hash_idx ON materials (file_hash) WHERE status <> 'removed';
CREATE INDEX materials_course_idx ON materials (course_id, type_id, academic_year);
CREATE INDEX materials_search_idx ON materials USING GIN (search);
CREATE INDEX courses_title_trgm_idx ON courses USING GIN (title gin_trgm_ops);

CREATE TABLE votes (
    material_id  UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id),
    value        SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    PRIMARY KEY (material_id, user_id)
);

CREATE TABLE reports (
    id           SERIAL PRIMARY KEY,
    material_id  UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    reporter_id  UUID REFERENCES users(id),
    reason       TEXT NOT NULL CHECK (reason IN ('copyright', 'personal_info', 'wrong_course', 'inappropriate', 'other')),
    details      TEXT,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
