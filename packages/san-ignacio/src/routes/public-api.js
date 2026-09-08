import { Router } from "express";
import { db } from "../lib/db.js";

export const publicApi = Router();

publicApi.get("/home", async (_req, res, next) => {
  try {
    const [schedulesResult, pastoralResult, noticesResult] = await Promise.all([
      db.query(`
        SELECT id, category, day_label, time_label, detail, sort_order
        FROM schedules
        WHERE active = TRUE
        ORDER BY sort_order ASC, id ASC
      `),
      db.query(`
        SELECT
          p.id, p.title, p.excerpt, p.body,
          p.author_name, p.published_at,
          p.youtube_url,
          m.secure_url AS image_url,
          m.alt_text AS image_alt
        FROM pastoral_posts p
        LEFT JOIN media m
          ON m.id = p.image_media_id
         AND m.media_type = 'image'
        WHERE p.status = 'published'
          AND p.published_at IS NOT NULL
          AND p.published_at <= NOW()
        ORDER BY p.published_at DESC
        LIMIT 1
      `),
      db.query(`
        SELECT id, title, body, priority
        FROM notices
        WHERE active = TRUE
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY priority DESC, created_at DESC
      `)
    ]);

    res.json({
      schedules: schedulesResult.rows,
      pastoral: pastoralResult.rows[0] || null,
      notices: noticesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

publicApi.get("/music", async (_req, res, next) => {
  try {
    const [itemsResult, concertsResult] = await Promise.all([
      db.query(`
        SELECT
          id, item_type, title, description,
          youtube_url, sort_order
        FROM music_items
        WHERE published = TRUE
        ORDER BY sort_order ASC, id DESC
        LIMIT 12
      `),

      db.query(`
        SELECT
          id, title, starts_at, location, description
        FROM concerts
        WHERE status = 'scheduled'
          AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 12
      `)
    ]);

    res.json({
      items: itemsResult.rows,
      concerts: concertsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

publicApi.get("/contact/health", async (_req, res, next) => {
  try {
    await db.query(`
      SELECT id
      FROM contact_messages
      LIMIT 1
    `);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

publicApi.post("/contact", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim() || null;
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    const website = String(req.body?.website || "").trim();

    if (website) {
      return res.status(204).end();
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: "Completa los campos obligatorios."
      });
    }

    if (name.length > 160) {
      return res.status(400).json({
        error: "El nombre es demasiado largo."
      });
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        error: "Escribe un correo electrónico válido."
      });
    }

    if (phone && phone.length > 60) {
      return res.status(400).json({
        error: "El teléfono es demasiado largo."
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        error: "El asunto es demasiado largo."
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: "El mensaje es demasiado largo."
      });
    }

    await db.query(`
      INSERT INTO contact_messages
        (name, email, phone, subject, message)
      VALUES
        ($1, $2, $3, $4, $5)
    `, [
      name,
      email,
      phone,
      subject,
      message
    ]);

    res.status(201).json({
      ok: true,
      message: "Mensaje recibido."
    });
  } catch (error) {
    next(error);
  }
});
publicApi.get("/institutional", async (_req, res, next) => {
  try {
    const [sectionsResult, cardsResult, staffResult] = await Promise.all([
      db.query(`
        SELECT
          s.slug,
          s.eyebrow,
          s.title,
          s.body,
          m.secure_url AS image_url,
          m.alt_text AS image_alt
        FROM institutional_sections s
        LEFT JOIN media m
          ON m.id = s.image_media_id
         AND m.media_type = 'image'
        WHERE s.published = TRUE
        ORDER BY s.slug
      `),

      db.query(`
        SELECT
          id,
          section_slug,
          label,
          title,
          body,
          sort_order
        FROM institutional_cards
        WHERE published = TRUE
        ORDER BY section_slug, sort_order ASC, id ASC
      `),

      db.query(`
        SELECT
          s.id,
          s.name,
          s.role,
          s.description,
          s.sort_order,
          m.secure_url AS image_url,
          m.alt_text AS image_alt
        FROM staff_members s
        LEFT JOIN media m
          ON m.id = s.media_id
         AND m.media_type = 'image'
        WHERE s.published = TRUE
        ORDER BY s.sort_order ASC, s.id ASC
      `)
    ]);

    res.json({
      sections: sectionsResult.rows,
      cards: cardsResult.rows,
      staff: staffResult.rows
    });
  } catch (error) {
    next(error);
  }
});