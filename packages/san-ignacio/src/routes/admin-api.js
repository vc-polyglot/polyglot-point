import { Router } from "express";
import { db, withTransaction } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminApi = Router();

adminApi.use(requireAuth);

adminApi.get("/overview", async (_req, res, next) => {
  try {
    const [pastoral, schedules, notices] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'published')::int AS published,
          COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts
        FROM pastoral_posts
      `),
      db.query(`SELECT COUNT(*)::int AS total FROM schedules WHERE active = TRUE`),
      db.query(`SELECT COUNT(*)::int AS total FROM notices WHERE active = TRUE`)
    ]);

    res.json({
      pastoral: pastoral.rows[0],
      schedules: schedules.rows[0].total,
      notices: notices.rows[0].total
    });
  } catch (error) {
    next(error);
  }
});

adminApi.get("/schedules", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, category, day_label, time_label, detail, sort_order, active
      FROM schedules
      ORDER BY sort_order ASC, id ASC
    `);
    res.json({ schedules: result.rows });
  } catch (error) {
    next(error);
  }
});

adminApi.put("/schedules", requireRole("admin"), async (req, res, next) => {
  try {
    const schedules = Array.isArray(req.body?.schedules) ? req.body.schedules : null;

    if (!schedules) {
      return res.status(400).json({ error: "Se esperaba una lista de horarios." });
    }

    if (schedules.length > 50) {
      return res.status(400).json({ error: "Demasiados horarios." });
    }

    const cleaned = schedules.map((item, index) => ({
      category: String(item.category || "").trim(),
      dayLabel: String(item.day_label || "").trim(),
      timeLabel: String(item.time_label || "").trim(),
      detail: String(item.detail || "").trim() || null,
      sortOrder: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index
    }));

    if (cleaned.some((item) => !item.category || !item.dayLabel || !item.timeLabel)) {
      return res.status(400).json({
        error: "Cada horario requiere categoría, día y hora."
      });
    }

    await withTransaction(async (client) => {
      await client.query("DELETE FROM schedules");
      for (const item of cleaned) {
        await client.query(`
          INSERT INTO schedules
            (category, day_label, time_label, detail, sort_order, active)
          VALUES ($1, $2, $3, $4, $5, TRUE)
        `, [
          item.category,
          item.dayLabel,
          item.timeLabel,
          item.detail,
          item.sortOrder
        ]);
      }
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminApi.get("/pastoral", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, title, excerpt, body, author_name, status, published_at, created_at, updated_at
      FROM pastoral_posts
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 30
    `);
    res.json({ posts: result.rows });
  } catch (error) {
    next(error);
  }
});

adminApi.post("/pastoral", requireRole("admin"), async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    const excerpt = String(req.body?.excerpt || "").trim() || null;
    const body = String(req.body?.body || "").trim();
    const authorName = String(req.body?.author_name || "").trim() || null;
    const publish = Boolean(req.body?.publish);

    if (!title || !body) {
      return res.status(400).json({ error: "Título y texto son obligatorios." });
    }

    const result = await db.query(`
      INSERT INTO pastoral_posts
        (title, excerpt, body, author_name, status, published_at)
      VALUES
        ($1, $2, $3, $4, $5, CASE WHEN $5 = 'published' THEN NOW() ELSE NULL END)
      RETURNING id, title, excerpt, body, author_name, status, published_at, created_at
    `, [
      title,
      excerpt,
      body,
      authorName,
      publish ? "published" : "draft"
    ]);

    res.status(201).json({ post: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

adminApi.patch("/pastoral/:id/publish", requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      UPDATE pastoral_posts
      SET status = 'published',
          published_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, title, status, published_at
    `, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Mensaje no encontrado." });
    }

    res.json({ post: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

adminApi.get("/notices", async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, title, body, starts_at, ends_at, priority, active, created_at
      FROM notices
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json({ notices: result.rows });
  } catch (error) {
    next(error);
  }
});

adminApi.post("/notices", requireRole("admin"), async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();

    if (!title || !body) {
      return res.status(400).json({ error: "Título y texto son obligatorios." });
    }

    const startsAt = req.body?.starts_at || null;
    const endsAt = req.body?.ends_at || null;
    const priority = Math.max(0, Math.min(10, Number(req.body?.priority || 0)));

    const result = await db.query(`
      INSERT INTO notices
        (title, body, starts_at, ends_at, priority, active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `, [title, body, startsAt, endsAt, priority]);

    res.status(201).json({ notice: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
