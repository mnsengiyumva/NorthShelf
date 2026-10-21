-- Seed data: Canada's regions, levels, lookups, and a few sample courses

INSERT INTO regions (type, code, name_en, name_fr) VALUES
    ('continent', 'NA', 'North America', 'Amérique du Nord');

INSERT INTO regions (parent_id, type, code, name_en, name_fr)
SELECT id, 'country', 'CA', 'Canada', 'Canada' FROM regions WHERE code = 'NA';

INSERT INTO regions (parent_id, type, code, name_en, name_fr)
SELECT p.id, v.type, v.code, v.name_en, v.name_fr
FROM (VALUES
    ('province',  'CA-AB', 'Alberta', 'Alberta'),
    ('province',  'CA-BC', 'British Columbia', 'Colombie-Britannique'),
    ('province',  'CA-MB', 'Manitoba', 'Manitoba'),
    ('province',  'CA-NB', 'New Brunswick', 'Nouveau-Brunswick'),
    ('province',  'CA-NL', 'Newfoundland and Labrador', 'Terre-Neuve-et-Labrador'),
    ('province',  'CA-NS', 'Nova Scotia', 'Nouvelle-Écosse'),
    ('province',  'CA-ON', 'Ontario', 'Ontario'),
    ('province',  'CA-PE', 'Prince Edward Island', 'Île-du-Prince-Édouard'),
    ('province',  'CA-QC', 'Quebec', 'Québec'),
    ('province',  'CA-SK', 'Saskatchewan', 'Saskatchewan'),
    ('territory', 'CA-NT', 'Northwest Territories', 'Territoires du Nord-Ouest'),
    ('territory', 'CA-NU', 'Nunavut', 'Nunavut'),
    ('territory', 'CA-YT', 'Yukon', 'Yukon')
) AS v(type, code, name_en, name_fr)
JOIN regions p ON p.code = 'CA';

INSERT INTO education_levels (slug, name_en, name_fr, sort_order) VALUES
    ('high_school', 'High School', 'École secondaire', 1),
    ('college',     'College',     'Collège',          2),
    ('university',  'University',  'Université',       3);

INSERT INTO subjects (slug, name_en, name_fr) VALUES
    ('mathematics',      'Mathematics',      'Mathématiques'),
    ('physics',          'Physics',          'Physique'),
    ('chemistry',        'Chemistry',        'Chimie'),
    ('biology',          'Biology',          'Biologie'),
    ('computer-science', 'Computer Science', 'Informatique'),
    ('english',          'English',          'Anglais'),
    ('french',           'French',           'Français'),
    ('history',          'History',          'Histoire'),
    ('economics',        'Economics',        'Économie'),
    ('business',         'Business',         'Affaires');

INSERT INTO material_types (slug, name_en, name_fr) VALUES
    ('past_exam',          'Past exam',          'Examen antérieur'),
    ('marking_scheme',     'Marking scheme',     'Corrigé'),
    ('notes',              'Class notes',        'Notes de cours'),
    ('study_guide',        'Study guide',        'Guide d''étude'),
    ('practice_problems',  'Practice problems',  'Exercices pratiques'),
    ('assignment',         'Assignment',         'Travail'),
    ('lab_report',         'Lab report',         'Rapport de laboratoire'),
    ('slides',             'Slides',             'Diapositives');

INSERT INTO licenses (slug, name, url) VALUES
    ('own-work',    'My own work, free to share on NorthShelf', NULL),
    ('cc0',         'CC0 (public domain dedication)',           'https://creativecommons.org/publicdomain/zero/1.0/'),
    ('cc-by',       'CC BY 4.0',                                'https://creativecommons.org/licenses/by/4.0/'),
    ('cc-by-nc',    'CC BY-NC 4.0',                             'https://creativecommons.org/licenses/by-nc/4.0/'),
    ('cc-by-nc-sa', 'CC BY-NC-SA 4.0',                          'https://creativecommons.org/licenses/by-nc-sa/4.0/');

-- A few sample high school courses (real provincial course codes) so the API returns data
INSERT INTO courses (level_id, region_id, subject_id, code, title, grade, language, status)
SELECT l.id, r.id, s.id, v.code, v.title, v.grade, 'en', 'approved'
FROM (VALUES
    ('CA-ON', 'mathematics', 'MHF4U', 'Advanced Functions', 12),
    ('CA-ON', 'mathematics', 'MCV4U', 'Calculus and Vectors', 12),
    ('CA-ON', 'physics',     'SPH4U', 'Physics', 12),
    ('CA-ON', 'chemistry',   'SCH4U', 'Chemistry', 12),
    ('CA-ON', 'biology',     'SBI4U', 'Biology', 12),
    ('CA-ON', 'english',     'ENG4U', 'English', 12),
    ('CA-AB', 'mathematics', 'Math 30-1', 'Mathematics 30-1', 12)
) AS v(region_code, subject_slug, code, title, grade)
JOIN regions r ON r.code = v.region_code
JOIN subjects s ON s.slug = v.subject_slug
JOIN education_levels l ON l.slug = 'high_school';
