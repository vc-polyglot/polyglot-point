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
}
