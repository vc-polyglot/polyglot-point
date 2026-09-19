import { Router } from "express";
import { db } from "../lib/db.js";

export const editorialPublicApi = Router();

editorialPublicApi.get("/home", async (_req, res, next) => {
  try {
    const [eventsResult, noticesResult] = await Promise.all([
      db.query(`
        SELECT
          e.id,
          e.event_type,
          e.title,
          e.excerpt,
          e.starts_at,
          e.ends_at,
          e.location,
          e.youtube_url,
          m.secure_url AS image_url,
          COALESCE(e.image_media_id::text, '') AS image_media_id,
          COALESCE(m.alt_text, e.title) AS image_alt
        FROM san_ignacio.editorial_events e
        LEFT JOIN san_ignacio.media m
          ON m.id = e.image_media_id
        WHERE e.published = TRUE
          AND e.featured_home = TRUE
          AND e.deleted_at IS NULL
          AND (e.ends_at IS NULL OR e.ends_at >= NOW() - INTERVAL '1 day')
        ORDER BY e.sort_order ASC, e.starts_at ASC, e.id ASC
        LIMIT 8
      `),
      db.query(`
        SELECT
          id,
          title,
          body,
          starts_at,
          ends_at,
          priority
        FROM san_ignacio.notices
        WHERE active = TRUE
          AND priority >= 8
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY priority DESC, created_at DESC
        LIMIT 4
      `)
    ]);

    res.json({
      events: eventsResult.rows,
      notices: noticesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

editorialPublicApi.get("/events", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        e.id,
        e.event_type,
        e.title,
        e.excerpt,
        e.body,
        e.starts_at,
        e.ends_at,
        e.location,
        e.youtube_url,
        e.featured_home,
        m.secure_url AS image_url,
        COALESCE(m.alt_text, e.title) AS image_alt
      FROM san_ignacio.editorial_events e
      LEFT JOIN san_ignacio.media m
        ON m.id = e.image_media_id
      WHERE e.published = TRUE
        AND e.deleted_at IS NULL
      ORDER BY
        CASE WHEN e.starts_at >= NOW() THEN 0 ELSE 1 END ASC,
        CASE WHEN e.starts_at >= NOW() THEN e.starts_at END ASC,
        CASE WHEN e.starts_at < NOW() THEN e.starts_at END DESC,
        e.sort_order ASC,
        e.id DESC
      LIMIT 100
    `);

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

editorialPublicApi.get("/gallery", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        g.id,
        g.caption,
        COALESCE(g.alt_text, m.alt_text, '') AS alt_text,
        g.sort_order,
        m.secure_url AS image_url,
        m.width,
        m.height
      FROM san_ignacio.gallery_items g
      JOIN san_ignacio.media m
        ON m.id = g.media_id
      WHERE g.published = TRUE
        AND m.media_type = 'image'
      ORDER BY g.sort_order ASC, g.id ASC
      LIMIT 200
    `);

    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

editorialPublicApi.get("/images", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        s.slot,
        s.alt_text,
        m.secure_url AS image_url,
        COALESCE(s.alt_text, m.alt_text, '') AS resolved_alt
      FROM san_ignacio.site_image_slots s
      LEFT JOIN san_ignacio.media m
        ON m.id = s.media_id
      ORDER BY s.slot ASC
    `);

    res.json({ slots: result.rows });
  } catch (error) {
    next(error);
  }
});
