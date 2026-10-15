import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const reconversionPublicApi = Router();
export const reconversionAdminApi = Router();

reconversionAdminApi.use(requireAuth);

function text(value, max = 12000) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value, max = 12000) {
  const cleaned = text(value, max);
  return cleaned || null;
}

function integer(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function positiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function slugify(value) {
  const base = text(value, 180)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return base || `item-${Date.now()}`;
}

async function uniquePastoralSlug(title, ignoreId = null) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const params = [candidate];
    let query = `
      SELECT id
      FROM san_ignacio.pastoral_categories
      WHERE slug = $1
    `;

    if (ignoreId) {
      params.push(ignoreId);
      query += ` AND id <> $2`;
    }

    query += ` LIMIT 1`;

    const result = await db.query(query, params);

    if (!result.rows[0]) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

reconversionPublicApi.get("/", async (_req, res, next) => {
  try {
    const [content, pastoralCategories, rectors] = await Promise.all([
      db.query(`
        SELECT
          slug,
          group_key,
          title,
          body,
          sort_order
        FROM san_ignacio.managed_content
        WHERE published = TRUE
        ORDER BY group_key ASC, sort_order ASC, slug ASC
      `),
      db.query(`
        SELECT
          id,
          slug,
          title,
          summary,
          body,
          contact,
          sort_order
        FROM san_ignacio.pastoral_categories
        WHERE published = TRUE
        ORDER BY sort_order ASC, title ASC, id ASC
      `),
      db.query(`
        SELECT
          id,
          name,
          period,
          body,
          sort_order
        FROM san_ignacio.history_rectors
        WHERE published = TRUE
        ORDER BY sort_order ASC, id ASC
      `)
    ]);

    res.json({
      content: content.rows,
      pastoral_categories: pastoralCategories.rows,
      rectors: rectors.rows
    });
  } catch (error) {
    next(error);
  }
});

reconversionAdminApi.get("/", async (_req, res, next) => {
  try {
    const [content, pastoralCategories, rectors] = await Promise.all([
      db.query(`
        SELECT
          slug,
          group_key,
          title,
          body,
          sort_order,
          published,
          updated_at
        FROM san_ignacio.managed_content
        ORDER BY group_key ASC, sort_order ASC, slug ASC
      `),
      db.query(`
        SELECT
          id,
          slug,
          title,
          summary,
          body,
          contact,
          sort_order,
          published,
          updated_at
        FROM san_ignacio.pastoral_categories
        ORDER BY sort_order ASC, title ASC, id ASC
      `),
      db.query(`
        SELECT
          id,
          name,
          period,
          body,
          sort_order,
          published,
          updated_at
        FROM san_ignacio.history_rectors
        ORDER BY sort_order ASC, id ASC
      `)
    ]);

    res.json({
      content: content.rows,
      pastoral_categories: pastoralCategories.rows,
      rectors: rectors.rows
    });
  } catch (error) {
    next(error);
  }
});

reconversionAdminApi.put(
  "/content/:slug",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const slug = text(req.params.slug, 180);
      const title = text(req.body?.title, 220);
      const body = optionalText(req.body?.body, 30000);
      const published = Boolean(req.body?.published);

      if (!slug || !title) {
        return res.status(400).json({
          error: "El título es obligatorio."
        });
      }

      const result = await db.query(`
        UPDATE san_ignacio.managed_content
        SET
          title = $2,
          body = $3,
          published = $4,
          updated_at = NOW()
        WHERE slug = $1
        RETURNING *
      `, [slug, title, body, published]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: "Contenido no encontrado."
        });
      }

      res.json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.post(
  "/pastoral-categories",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const title = text(req.body?.title, 180);

      if (!title) {
        return res.status(400).json({
          error: "El nombre del área pastoral es obligatorio."
        });
      }

      const slug = await uniquePastoralSlug(title);

      const result = await db.query(`
        INSERT INTO san_ignacio.pastoral_categories
          (
            slug,
            title,
            summary,
            body,
            contact,
            sort_order,
            published
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        slug,
        title,
        optionalText(req.body?.summary, 1200),
        optionalText(req.body?.body, 20000),
        optionalText(req.body?.contact, 500),
        integer(req.body?.sort_order, 0),
        Boolean(req.body?.published)
      ]);

      res.status(201).json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.patch(
  "/pastoral-categories/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);
      const title = text(req.body?.title, 180);

      if (!id || !title) {
        return res.status(400).json({
          error: "Área pastoral inválida."
        });
      }

      const slug = await uniquePastoralSlug(title, id);

      const result = await db.query(`
        UPDATE san_ignacio.pastoral_categories
        SET
          slug = $2,
          title = $3,
          summary = $4,
          body = $5,
          contact = $6,
          sort_order = $7,
          published = $8,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        id,
        slug,
        title,
        optionalText(req.body?.summary, 1200),
        optionalText(req.body?.body, 20000),
        optionalText(req.body?.contact, 500),
        integer(req.body?.sort_order, 0),
        Boolean(req.body?.published)
      ]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: "Área pastoral no encontrada."
        });
      }

      res.json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.delete(
  "/pastoral-categories/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "Área pastoral inválida."
        });
      }

      const result = await db.query(`
        DELETE FROM san_ignacio.pastoral_categories
        WHERE id = $1
        RETURNING id
      `, [id]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: "Área pastoral no encontrada."
        });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.post(
  "/rectors",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const name = text(req.body?.name, 220);

      if (!name) {
        return res.status(400).json({
          error: "El nombre del rector es obligatorio."
        });
      }

      const result = await db.query(`
        INSERT INTO san_ignacio.history_rectors
          (
            name,
            period,
            body,
            sort_order,
            published
          )
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        name,
        optionalText(req.body?.period, 180),
        optionalText(req.body?.body, 16000),
        integer(req.body?.sort_order, 0),
        Boolean(req.body?.published)
      ]);

      res.status(201).json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.patch(
  "/rectors/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);
      const name = text(req.body?.name, 220);

      if (!id || !name) {
        return res.status(400).json({
          error: "Rector inválido."
        });
      }

      const result = await db.query(`
        UPDATE san_ignacio.history_rectors
        SET
          name = $2,
          period = $3,
          body = $4,
          sort_order = $5,
          published = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        id,
        name,
        optionalText(req.body?.period, 180),
        optionalText(req.body?.body, 16000),
        integer(req.body?.sort_order, 0),
        Boolean(req.body?.published)
      ]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: "Rector no encontrado."
        });
      }

      res.json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

reconversionAdminApi.delete(
  "/rectors/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "Rector inválido."
        });
      }

      const result = await db.query(`
        DELETE FROM san_ignacio.history_rectors
        WHERE id = $1
        RETURNING id
      `, [id]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: "Rector no encontrado."
        });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);
