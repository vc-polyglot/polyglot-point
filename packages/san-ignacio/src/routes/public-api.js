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
        SELECT id, title, excerpt, body, author_name, published_at
        FROM pastoral_posts
        WHERE status = 'published'
          AND published_at IS NOT NULL
          AND published_at <= NOW()
        ORDER BY published_at DESC
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
