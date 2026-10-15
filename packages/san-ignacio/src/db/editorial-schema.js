import { db } from "../lib/db.js";

export async function ensureEditorialSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.editorial_events (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL DEFAULT 'Evento',
      title TEXT NOT NULL,
      excerpt TEXT,
      body TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      location TEXT,
      image_media_id BIGINT REFERENCES san_ignacio.media(id) ON DELETE SET NULL,
      youtube_url TEXT,
      featured_home BOOLEAN NOT NULL DEFAULT FALSE,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      published_at TIMESTAMPTZ,
      sort_order INTEGER NOT NULL DEFAULT 0,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS editorial_events_public_idx
    ON san_ignacio.editorial_events
      (published, deleted_at, starts_at, featured_home)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.gallery_items (
      id BIGSERIAL PRIMARY KEY,
      media_id BIGINT NOT NULL REFERENCES san_ignacio.media(id) ON DELETE CASCADE,
      caption TEXT,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS gallery_items_public_idx
    ON san_ignacio.gallery_items (published, sort_order, id)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.site_image_slots (
      slot TEXT PRIMARY KEY,
      media_id BIGINT REFERENCES san_ignacio.media(id) ON DELETE SET NULL,
      alt_text TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.managed_content (
      slug TEXT PRIMARY KEY,
      group_key TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS managed_content_public_idx
    ON san_ignacio.managed_content
      (group_key, published, sort_order, slug)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.pastoral_categories (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      contact TEXT,
      media_id BIGINT REFERENCES san_ignacio.media(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS pastoral_categories_public_idx
    ON san_ignacio.pastoral_categories
      (published, sort_order, title)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS san_ignacio.history_rectors (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      period TEXT,
      body TEXT,
      media_id BIGINT REFERENCES san_ignacio.media(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS history_rectors_public_idx
    ON san_ignacio.history_rectors
      (published, sort_order, id)
  `);

  await db.query(`
    INSERT INTO san_ignacio.managed_content
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
1. Acudir de lunes a viernes de 10:00 a 14:00 y de 16:00 a 18:00 h con un recipiente vacío, máximo 2 litros, y solicitarla en la oficina.
2. Acudir en horario de misa —lunes a viernes 7:30, 13:30 y 18:30 h— trayendo su propia agua, sin restricción, y pedir al sacerdote al final de la misa que la bendiga.$$,
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
    ON CONFLICT (slug) DO NOTHING
  `);
}
