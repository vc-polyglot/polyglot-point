import { Router } from "express";
import { db, withTransaction } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const adminApi = Router();

adminApi.use(requireAuth);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const type = String(file.mimetype || "").toLowerCase();

    if (!type.startsWith("image/") || type === "image/svg+xml") {
      return callback(new Error("Solo se permiten imágenes válidas."));
    }

    callback(null, true);
  }
});

function receiveImage(req, res, next) {
  imageUpload.single("image")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "La imagen supera el límite de 20 MB."
      });
    }

    if (error) {
      return res.status(400).json({
        error: error.message || "No se pudo leer la imagen."
      });
    }

    next();
  });
}

function sendImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: "image",
      folder: "san-ignacio/images",
      tags: ["san-ignacio"],
      format: "webp",
      overwrite: false,
      transformation: [{
        width: 2400,
        height: 2400,
        crop: "limit",
        quality: "auto:good"
      }]
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
}

adminApi.post("/media/images", requireRole("admin"), receiveImage, async (req, res, next) => {
  let uploadedPublicId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Selecciona una imagen."
      });
    }

    const altText = String(req.body?.alt_text || "").trim().slice(0, 300) || null;

    const uploaded = await sendImageToCloudinary(req.file.buffer);
    uploadedPublicId = uploaded.public_id;

    const secureUrl = uploaded.secure_url || uploaded.url;

    const result = await db.query(`
      INSERT INTO media
        (media_type, provider, public_id, url, secure_url, width, height, bytes, alt_text)
      VALUES
        ('image', 'cloudinary', $1, $2, $2, $3, $4, $5, $6)
      RETURNING
        id, media_type, provider, public_id, secure_url,
        width, height, bytes, alt_text, created_at
    `, [
      uploaded.public_id,
      secureUrl,
      uploaded.width || null,
      uploaded.height || null,
      uploaded.bytes || null,
      altText
    ]);

    res.status(201).json({
      image: result.rows[0]
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: "image",
          invalidate: true
        });
      } catch {
        // No ocultar el error principal si falla la limpieza.
      }
    }

    next(error);
  }
});

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

const SAN_IGNACIO_IMAGE_QUOTA_BYTES = 4 * 1024 * 1024 * 1024;

adminApi.get("/media/images", async (_req, res, next) => {
  try {
    const [imagesResult, usageResult] = await Promise.all([
      db.query(`
        SELECT
          id, public_id, url, secure_url, width, height,
          bytes, alt_text, created_at
        FROM media
        WHERE media_type = 'image'
          AND provider = 'cloudinary'
        ORDER BY created_at DESC
        LIMIT 500
      `),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(bytes), 0)::bigint AS used_bytes
        FROM media
        WHERE media_type = 'image'
          AND provider = 'cloudinary'
      `)
    ]);

    const usedBytes = Number(usageResult.rows[0]?.used_bytes || 0);
    const quotaBytes = SAN_IGNACIO_IMAGE_QUOTA_BYTES;
    const percent = quotaBytes > 0
      ? Math.round((usedBytes / quotaBytes) * 1000) / 10
      : 0;

    res.json({
      images: imagesResult.rows,
      storage: {
        total: Number(usageResult.rows[0]?.total || 0),
        used_bytes: usedBytes,
        quota_bytes: quotaBytes,
        percent
      }
    });
  } catch (error) {
    next(error);
  }
});

adminApi.get("/media/images/:id/download", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      SELECT id, url, secure_url
      FROM media
      WHERE id = $1
        AND media_type = 'image'
        AND provider = 'cloudinary'
    `, [id]);

    const image = result.rows[0];

    if (!image) {
      return res.status(404).json({ error: "Imagen no encontrada." });
    }

    const sourceUrl = image.secure_url || image.url;

    if (!sourceUrl) {
      return res.status(404).json({ error: "La imagen no tiene archivo asociado." });
    }

    const downloadUrl = sourceUrl.includes("/upload/")
      ? sourceUrl.replace("/upload/", "/upload/fl_attachment/")
      : sourceUrl;

    res.redirect(302, downloadUrl);
  } catch (error) {
    next(error);
  }
});

adminApi.delete("/media/images/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      SELECT id, public_id
      FROM media
      WHERE id = $1
        AND media_type = 'image'
        AND provider = 'cloudinary'
    `, [id]);

    const image = result.rows[0];

    if (!image) {
      return res.status(404).json({ error: "Imagen no encontrada." });
    }

    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id, {
        resource_type: "image",
        invalidate: true
      });
    }

    await db.query("DELETE FROM media WHERE id = $1", [id]);

    res.status(204).end();
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
