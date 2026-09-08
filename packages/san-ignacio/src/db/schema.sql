CREATE SCHEMA IF NOT EXISTS san_ignacio;
SET search_path TO san_ignacio, public;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'music')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pastoral_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  excerpt TEXT,
  body TEXT NOT NULL,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pastoral_posts_published
  ON pastoral_posts (status, published_at DESC);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  day_label TEXT NOT NULL,
  time_label TEXT NOT NULL,
  detail TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_active_sort
  ON schedules (active, sort_order, id);

CREATE TABLE IF NOT EXISTS notices (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id BIGSERIAL PRIMARY KEY,
  media_type TEXT NOT NULL
    CHECK (media_type IN ('image', 'video', 'audio', 'document')),
  provider TEXT NOT NULL DEFAULT 'cloudinary',
  public_id TEXT,
  url TEXT NOT NULL,
  secure_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC,
  bytes BIGINT,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS music_items (
  id BIGSERIAL PRIMARY KEY,
  item_type TEXT NOT NULL
    CHECK (item_type IN ('recording', 'repertoire', 'article')),
  title TEXT NOT NULL,
  description TEXT,
  media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concerts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE pastoral_posts
  ADD COLUMN IF NOT EXISTS image_media_id BIGINT REFERENCES media(id) ON DELETE SET NULL;

ALTER TABLE pastoral_posts
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE music_items
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx
  ON contact_messages (status, created_at DESC);
CREATE TABLE IF NOT EXISTS institutional_sections (
  slug TEXT PRIMARY KEY
    CHECK (slug IN ('about', 'spirituality')),
  eyebrow TEXT,
  title TEXT NOT NULL,
  body TEXT,
  image_media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institutional_cards (
  id BIGSERIAL PRIMARY KEY,
  section_slug TEXT NOT NULL
    REFERENCES institutional_sections(slug) ON DELETE CASCADE,
  label TEXT,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO institutional_sections
  (slug, eyebrow, title, body, published)
VALUES
  (
    'about',
    'Arquitectura y comunidad',
    'Una iglesia modernista viva.',
    'El templo de San Ignacio de Loyola, en Polanco, fue proyectado por Juan Sordo Madaleno en 1961 y está catalogado por el Instituto Nacional de Bellas Artes.',
    TRUE
  ),
  (
    'spirituality',
    'Espiritualidad jesuita',
    'Encontrar a Dios en todas las cosas.',
    'La espiritualidad ignaciana nace de la experiencia de san Ignacio de Loyola y encuentra en los Ejercicios Espirituales una de sus expresiones centrales.',
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO institutional_cards
  (section_slug, label, title, body, sort_order, published)
SELECT
  'spirituality',
  '01',
  'Ignacio',
  'Ejercicios Espirituales y una manera de encontrar a Dios en todas las cosas.',
  10,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM institutional_cards
  WHERE section_slug = 'spirituality'
    AND title = 'Ignacio'
);

INSERT INTO institutional_cards
  (section_slug, label, title, body, sort_order, published)
SELECT
  'spirituality',
  '02',
  'México',
  'La presencia de la Compañía de Jesús en México forma parte de una historia iniciada en 1572.',
  20,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM institutional_cards
  WHERE section_slug = 'spirituality'
    AND title = 'México'
);

INSERT INTO institutional_cards
  (section_slug, label, title, body, sort_order, published)
SELECT
  'spirituality',
  '03',
  'Polanco',
  'Una comunidad en la que la tradición ignaciana continúa formando parte de la vida cotidiana del templo.',
  30,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM institutional_cards
  WHERE section_slug = 'spirituality'
    AND title = 'Polanco'
);

INSERT INTO staff_members
  (slug, name, role, description, sort_order, published)
VALUES
  (
    'luis-gonzalez-cosio',
    'P. Luis González-Cosío Elcoro, S.J.',
    'Rector',
    NULL,
    10,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;