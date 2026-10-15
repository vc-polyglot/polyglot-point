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

ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS image_media_id BIGINT REFERENCES media(id) ON DELETE SET NULL;

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

-- SAN IGNACIO EDITORIAL CMS V8

CREATE TABLE IF NOT EXISTS editorial_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT 'Evento',
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  image_media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  youtube_url TEXT,
  featured_home BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_events_public_idx
  ON editorial_events (published, deleted_at, starts_at, featured_home);

CREATE TABLE IF NOT EXISTS gallery_items (
  id BIGSERIAL PRIMARY KEY,
  media_id BIGINT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  caption TEXT,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gallery_items_public_idx
  ON gallery_items (published, sort_order, id);

CREATE TABLE IF NOT EXISTS site_image_slots (
  slot TEXT PRIMARY KEY,
  media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  alt_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- END SAN IGNACIO EDITORIAL CMS V8

-- SAN IGNACIO RECONVERSION V1

CREATE TABLE IF NOT EXISTS managed_content (
  slug TEXT PRIMARY KEY,
  group_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS managed_content_public_idx
  ON managed_content (group_key, published, sort_order, slug);

CREATE TABLE IF NOT EXISTS pastoral_categories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  contact TEXT,
  media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pastoral_categories_public_idx
  ON pastoral_categories (published, sort_order, title);

CREATE TABLE IF NOT EXISTS history_rectors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  period TEXT,
  body TEXT,
  media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS history_rectors_public_idx
  ON history_rectors (published, sort_order, id);

INSERT INTO managed_content
  (slug, group_key, title, body, sort_order, published)
VALUES
  (
    'mass-intentions',
    'liturgy',
    'Intenciones de misa',
    $$Para solicitar una intención de misa, consulte disponibilidad y registro en la oficina de la iglesia.$$,
    10,
    TRUE
  ),
  (
    'sacrament-bautismo',
    'sacrament',
    'Bautismo',
    $$Para niños menores de 7 años.
Son individuales.
Horarios: sábado, dependiendo de la disponibilidad en la agenda de la iglesia, a las 9:00, 10:00, 11:00 o 12:00 h.
No se hacen reservaciones por teléfono.

Trámites parroquiales para obtener la fe de bautismo:
Formato que se entrega al reservar la ceremonia, con los datos solicitados.
Acta de nacimiento del bautizado: original y copia fotostática. Para niños mayores de 3 años, presentar la primera acta de nacimiento y otra con fecha reciente.

Extranjeros:
Original y copia del acta de nacimiento apostillada. En caso de doble nacionalidad, también original y copia del acta de nacimiento mexicana. Copia del pasaporte del bautizado y de los papás.

Padrinos:
Puede haber un solo padrino o madrina, o una pareja formada por hombre y mujer. Deben ser mayores de 16 años. Si son esposos, presentar copia del acta de matrimonio religioso. Si son solteros, copia reciente de la fe de bautismo y copia por ambos lados del INE.

Pláticas prebautismales:
Entregar constancia de participación de los papás y padrinos. Pueden tomarlas en cualquier parroquia.

Pago de derechos por anotación en el libro de bautismo y expedición de la fe de bautismo: $300.$$,
    10,
    TRUE
  ),
  (
    'sacrament-primera-comunion',
    'sacrament',
    'Primera Comunión',
    $$La edad mínima para recibir el sacramento es de 9 años.
Son individuales.
Horarios: sábado, dependiendo de la disponibilidad en la agenda de la iglesia, a las 9:00, 10:00, 11:00 o 12:00 h.
No se hacen reservaciones por teléfono.

Documentos:
Comprobante del curso de catecismo concluido.
Acta de bautismo, original y copia.
Acta de nacimiento, original y copia.
Los padrinos deben ser católicos y presentar copia de sus identificaciones.$$,
    20,
    TRUE
  ),
  (
    'sacrament-confirmacion',
    'sacrament',
    'Confirmación',
    $$Este sacramento se imparte cada año en la fiesta de San Ignacio de Loyola, el 31 de julio.
Se recomienda llamar a la oficina durante junio para obtener información sobre inscripciones, requisitos y fechas del curso de preparación.
La edad mínima para recibir el sacramento es de 14 años.$$,
    30,
    TRUE
  ),
  (
    'sacrament-matrimonio',
    'sacrament',
    'Matrimonio',
    $$El sacramento del matrimonio se ofrece en sábado a las 13:00, 17:00 y 20:00 h.

Requisito indispensable:
Presentar, en cuanto la obtengan, la licencia matrimonial: el permiso para la celebración canónica del matrimonio que los novios tramitan por lo menos 3 meses antes de la ceremonia en la parroquia cercana al domicilio de la novia.

El estipendio incluye:
Uso de las instalaciones y servicios para la celebración.
Sacerdote celebrante.
Personal de sacristía.
Instalación de reclinatorios y bancos para los novios.

No incluye adorno floral.$$,
    40,
    TRUE
  ),
  (
    'sacrament-confesiones',
    'sacrament',
    'Confesiones',
    $$Al final de las misas de lunes a sábado, pedir al sacerdote celebrante la confesión.$$,
    50,
    TRUE
  ),
  (
    'agua-san-ignacio',
    'water',
    'Agua de San Ignacio',
    $$El Agua de San Ignacio es agua natural bendecida por el rito y oraciones en honor a San Ignacio de Loyola, aprobadas por la Iglesia, para obtener por intercesión del fundador de la Compañía de Jesús algún favor particular.

Con la aprobación papal, el Agua de San Ignacio es un sacramental que adquiere fuerza contra el mal espíritu y fomenta los sentimientos de fe, esperanza y caridad.

No hay que esperar que el Agua de San Ignacio haga milagros o realice magia. Es uno de los medios de los que Dios se sirve para otorgar favores o gracias especiales.

El Agua de San Ignacio no se vende.

Hay dos modos para obtenerla:
 Acudir de lunes a viernes de 10:00 a 14:00 y de 16:00 a 18:00 h con un recipiente vacío, máximo 2 litros, y solicitarla en la oficina.
 Acudir en horario de misa —lunes a viernes 7:30, 13:30 y 18:30 h— trayendo su propia agua, sin restricción, y pedir al sacerdote al final de la misa que la bendiga.$$,
    10,
    TRUE
  ),
  (
    'history-patria',
    'history',
    'Instituto Patria',
    NULL,
    10,
    TRUE
  ),
  (
    'history-capilla',
    'history',
    'Capilla',
    NULL,
    20,
    TRUE
  ),
  (
    'history-arquitectura',
    'history',
    'Arquitectura',
    $$El templo de San Ignacio de Loyola, en Polanco, fue proyectado por Juan Sordo Madaleno en 1961 y está catalogado por el Instituto Nacional de Bellas Artes.$$,
    30,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- END SAN IGNACIO RECONVERSION V1
