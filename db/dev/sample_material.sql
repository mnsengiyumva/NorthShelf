-- Dev only: inserts one published sample material so the UI has something to show.
-- Run with:
--   docker compose exec -T db psql -U northshelf -d northshelf < db/dev/sample_material.sql
INSERT INTO users (email, display_name) VALUES ('test@example.com', 'testuser')
ON CONFLICT (email) DO NOTHING;

INSERT INTO materials (course_id, type_id, license_id, uploader_id, title,
                       file_key, file_hash, file_size, mime_type, status, academic_year)
SELECT c.id, t.id, l.id, u.id, 'MHF4U 2024 Final Exam (sample)',
       'test/sample.pdf', 'sample-hash-1', 1000, 'application/pdf', 'published', 2024
FROM courses c, material_types t, licenses l, users u
WHERE c.code = 'MHF4U' AND t.slug = 'past_exam'
  AND l.slug = 'own-work' AND u.email = 'test@example.com'
ON CONFLICT DO NOTHING;
