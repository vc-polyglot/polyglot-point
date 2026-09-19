import { Router } from "express";
import { db, withTransaction } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const editorialAdminApi = Router();

editorialAdminApi.use(requireAuth);

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function text(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value, max = 5000) {
  const cleaned = text(value, max);
  return cleaned || null;
}

function dateValue(value, required = false) {
  if (!value) {
    if (required) {
      throw new Error("La fecha de inicio es obligatoria.");
    }
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida.");
  }

  return parsed.toISOString();
}

function youtubeValue(value) {
  const cleaned = optionalText(value, 500);

  if (!cleaned) return null;

  let parsed;

  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("La liga de YouTube no es válida.");
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    throw new Error("La liga debe ser de YouTube.");
  }

  return parsed.toString();
}

function eventPayload(body) {
  const title = text(body?.title, 220);

  if (!title) {
    throw new Error("El título es obligatorio.");
  }

  const startsAt = dateValue(body?.starts_at, true);
  const endsAt = dateValue(body?.ends_at, false);

  if (endsAt && new Date(endsAt) < new Date(startsAt)) {
    throw new Error("La fecha final no puede ser anterior al inicio.");
  }

  const imageMediaId = body?.image_media_id
    ? positiveId(body.image_media_id)
    : null;

  if (body?.image_media_id && !imageMediaId) {
    throw new Error("La fotografía seleccionada no es válida.");
  }

  return {
    eventType: text(body?.event_type || "Evento", 100) || "Evento",
    title,
    excerpt: optionalText(body?.excerpt, 800),
    body: optionalText(body?.body, 12000),
    startsAt,
    endsAt,
    location: optionalText(body?.location, 300),
    imageMediaId,
    youtubeUrl: youtubeValue(body?.youtube_url),
    featuredHome: Boolean(body?.featured_home),
    published: Boolean(body?.published),
    sortOrder: Number.isFinite(Number(body?.sort_order))
      ? Math.trunc(Number(body.sort_order))
      : 0
  };
}

async function assertImageMedia(id) {
  if (!id) return;

  const result = await db.query(`
    SELECT id
    FROM san_ignacio.media
    WHERE id = $1
      AND media_type = 'image'
    LIMIT 1
  `, [id]);

  if (!result.rows[0]) {
    throw new Error("La fotografía seleccionada ya no existe.");
  }
}

editorialAdminApi.get("/overview", async (_req, res, next) => {
  try {
    const [events, gallery, slots] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
          COUNT(*) FILTER (
            WHERE deleted_at IS NULL AND published = TRUE
          )::int AS published,
          COUNT(*) FILTER (
            WHERE deleted_at IS NULL AND featured_home = TRUE
          )::int AS featured
        FROM san_ignacio.editorial_events
      `),
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM san_ignacio.gallery_items
        WHERE published = TRUE
      `),
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM san_ignacio.site_image_slots
        WHERE media_id IS NOT NULL
      `)
    ]);

    res.json({
      events: events.rows[0],
      gallery: gallery.rows[0].total,
      image_slots: slots.rows[0].total
    });
  } catch (error) {
    next(error);
  }
});

editorialAdminApi.get("/events", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        e.*,
        m.secure_url AS image_url,
        COALESCE(m.alt_text, e.title) AS image_alt
      FROM san_ignacio.editorial_events e
      LEFT JOIN san_ignacio.media m
        ON m.id = e.image_media_id
      WHERE e.deleted_at IS NULL
      ORDER BY e.starts_at DESC, e.id DESC
      LIMIT 200
    `);

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

editorialAdminApi.post(
  "/events",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const payload = eventPayload(req.body);
      await assertImageMedia(payload.imageMediaId);

      const result = await db.query(`
        INSERT INTO san_ignacio.editorial_events (
          event_type,
          title,
          excerpt,
          body,
          starts_at,
          ends_at,
          location,
          image_media_id,
          youtube_url,
          featured_home,
          published,
          published_at,
          sort_order
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
          CASE WHEN $11 = TRUE THEN NOW() ELSE NULL END,
          $12
        )
        RETURNING *
      `, [
        payload.eventType,
        payload.title,
        payload.excerpt,
        payload.body,
        payload.startsAt,
        payload.endsAt,
        payload.location,
        payload.imageMediaId,
        payload.youtubeUrl,
        payload.featuredHome,
        payload.published,
        payload.sortOrder
      ]);

      res.status(201).json({ event: result.rows[0] });
    } catch (error) {
      if (error.message?.includes("obligatoria") ||
          error.message?.includes("inválida") ||
          error.message?.includes("YouTube") ||
          error.message?.includes("fotografía") ||
          error.message?.includes("anterior")) {
        return res.status(400).json({ error: error.message });
      }

      next(error);
    }
  }
);

editorialAdminApi.patch(
  "/events/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const payload = eventPayload(req.body);
      await assertImageMedia(payload.imageMediaId);

      const result = await db.query(`
        UPDATE san_ignacio.editorial_events
        SET
          event_type = $2,
          title = $3,
          excerpt = $4,
          body = $5,
          starts_at = $6,
          ends_at = $7,
          location = $8,
          image_media_id = $9,
          youtube_url = $10,
          featured_home = $11,
          published = $12,
          published_at = CASE
            WHEN $12 = TRUE AND published_at IS NULL THEN NOW()
            WHEN $12 = FALSE THEN NULL
            ELSE published_at
          END,
          sort_order = $13,
          updated_at = NOW()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `, [
        id,
        payload.eventType,
        payload.title,
        payload.excerpt,
        payload.body,
        payload.startsAt,
        payload.endsAt,
        payload.location,
        payload.imageMediaId,
        payload.youtubeUrl,
        payload.featuredHome,
        payload.published,
        payload.sortOrder
      ]);

      if (!result.rows[0]) {
        return res.status(404).json({ error: "Evento no encontrado." });
      }

      res.json({ event: result.rows[0] });
    } catch (error) {
      if (error.message?.includes("obligatoria") ||
          error.message?.includes("inválida") ||
          error.message?.includes("YouTube") ||
          error.message?.includes("fotografía") ||
          error.message?.includes("anterior")) {
        return res.status(400).json({ error: error.message });
      }

      next(error);
    }
  }
);

editorialAdminApi.delete(
  "/events/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const result = await db.query(`
        UPDATE san_ignacio.editorial_events
        SET
          deleted_at = NOW(),
          featured_home = FALSE,
          published = FALSE,
          updated_at = NOW()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING id
      `, [id]);

      if (!result.rows[0]) {
        return res.status(404).json({ error: "Evento no encontrado." });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

editorialAdminApi.get("/gallery", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        g.id,
        g.media_id,
        g.caption,
        g.alt_text,
        g.sort_order,
        g.published,
        m.secure_url AS image_url,
        COALESCE(g.alt_text, m.alt_text, '') AS resolved_alt
      FROM san_ignacio.gallery_items g
      JOIN san_ignacio.media m
        ON m.id = g.media_id
      ORDER BY g.sort_order ASC, g.id ASC
      LIMIT 200
    `);

    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

editorialAdminApi.put(
  "/gallery",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : null;

      if (!items) {
        return res.status(400).json({ error: "Se esperaba una lista de fotografías." });
      }

      if (items.length > 200) {
        return res.status(400).json({ error: "Demasiadas fotografías." });
      }

      const cleaned = items.map((item, index) => {
        const mediaId = positiveId(item.media_id);

        if (!mediaId) {
          throw new Error("Hay una fotografía inválida.");
        }

        return {
          mediaId,
          caption: optionalText(item.caption, 500),
          altText: optionalText(item.alt_text, 500),
          sortOrder: Number.isFinite(Number(item.sort_order))
            ? Math.trunc(Number(item.sort_order))
            : index,
          published: item.published !== false
        };
      });

      const uniqueIds = [...new Set(cleaned.map((item) => item.mediaId))];

      if (uniqueIds.length) {
        const mediaResult = await db.query(`
          SELECT id
          FROM san_ignacio.media
          WHERE id = ANY($1::bigint[])
            AND media_type = 'image'
        `, [uniqueIds]);

        if (mediaResult.rows.length !== uniqueIds.length) {
          return res.status(400).json({
            error: "Una o más fotografías ya no existen."
          });
        }
      }

      await withTransaction(async (client) => {
        await client.query("DELETE FROM san_ignacio.gallery_items");

        for (const item of cleaned) {
          await client.query(`
            INSERT INTO san_ignacio.gallery_items (
              media_id,
              caption,
              alt_text,
              sort_order,
              published
            )
            VALUES ($1,$2,$3,$4,$5)
          `, [
            item.mediaId,
            item.caption,
            item.altText,
            item.sortOrder,
            item.published
          ]);
        }
      });

      res.json({ ok: true });
    } catch (error) {
      if (error.message?.includes("fotografía")) {
        return res.status(400).json({ error: error.message });
      }

      next(error);
    }
  }
);

editorialAdminApi.get("/images", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        s.slot,
        s.media_id,
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

editorialAdminApi.put(
  "/images",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const slots = Array.isArray(req.body?.slots) ? req.body.slots : null;

      if (!slots) {
        return res.status(400).json({ error: "Se esperaba una lista de posiciones." });
      }

      if (slots.length > 30) {
        return res.status(400).json({ error: "Demasiadas posiciones de imagen." });
      }

      const cleaned = slots.map((item) => {
        const slot = text(item.slot, 100);

        if (!/^[a-z0-9_-]{2,100}$/.test(slot)) {
          throw new Error("Hay una posición de imagen inválida.");
        }

        const mediaId = item.media_id ? positiveId(item.media_id) : null;

        if (item.media_id && !mediaId) {
          throw new Error("Hay una fotografía inválida.");
        }

        return {
          slot,
          mediaId,
          altText: optionalText(item.alt_text, 500)
        };
      });

      const mediaIds = [...new Set(
        cleaned.map((item) => item.mediaId).filter(Boolean)
      )];

      if (mediaIds.length) {
        const mediaResult = await db.query(`
          SELECT id
          FROM san_ignacio.media
          WHERE id = ANY($1::bigint[])
            AND media_type = 'image'
        `, [mediaIds]);

        if (mediaResult.rows.length !== mediaIds.length) {
          return res.status(400).json({
            error: "Una o más fotografías ya no existen."
          });
        }
      }

      await withTransaction(async (client) => {
        for (const item of cleaned) {
          await client.query(`
            INSERT INTO san_ignacio.site_image_slots (
              slot,
              media_id,
              alt_text,
              updated_at
            )
            VALUES ($1,$2,$3,NOW())
            ON CONFLICT (slot)
            DO UPDATE SET
              media_id = EXCLUDED.media_id,
              alt_text = EXCLUDED.alt_text,
              updated_at = NOW()
          `, [item.slot, item.mediaId, item.altText]);
        }
      });

      res.json({ ok: true });
    } catch (error) {
      if (error.message?.includes("imagen") ||
          error.message?.includes("fotografía") ||
          error.message?.includes("posición")) {
        return res.status(400).json({ error: error.message });
      }

      next(error);
    }
  }
);
