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
      SELECT
        p.id, p.title, p.excerpt, p.body, p.author_name,
        p.status, p.published_at, p.created_at, p.updated_at,
        p.image_media_id, p.youtube_url,
        m.secure_url AS image_url,
        m.alt_text AS image_alt
      FROM pastoral_posts p
      LEFT JOIN media m
        ON m.id = p.image_media_id
       AND m.media_type = 'image'
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
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

    const imageMediaIdRaw = req.body?.image_media_id;
    const imageMediaId = imageMediaIdRaw
      ? Number(imageMediaIdRaw)
      : null;

    const youtubeRaw = String(req.body?.youtube_url || "").trim();
    let youtubeUrl = null;

    if (imageMediaId !== null) {
      if (!Number.isInteger(imageMediaId) || imageMediaId <= 0) {
        return res.status(400).json({ error: "Imagen inválida." });
      }

      const imageCheck = await db.query(`
        SELECT id
        FROM media
        WHERE id = $1
          AND media_type = 'image'
          AND provider = 'cloudinary'
      `, [imageMediaId]);

      if (!imageCheck.rows[0]) {
        return res.status(400).json({ error: "La fotografía seleccionada no existe." });
      }
    }

    if (youtubeRaw) {
      try {
        const parsed = new URL(youtubeRaw);
        const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
        let videoId = null;

        if (host === "youtu.be") {
          videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
        } else if (host === "youtube.com" || host === "m.youtube.com") {
          if (parsed.pathname === "/watch") {
            videoId = parsed.searchParams.get("v");
          } else {
            const parts = parsed.pathname.split("/").filter(Boolean);

            if (["embed", "shorts", "live"].includes(parts[0])) {
              videoId = parts[1] || null;
            }
          }
        }

        if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
          return res.status(400).json({ error: "La dirección de YouTube no es válida." });
        }

        youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      } catch {
        return res.status(400).json({ error: "La dirección de YouTube no es válida." });
      }
    }

    if (!title || !body) {
      return res.status(400).json({ error: "Título y texto son obligatorios." });
    }

    const result = await db.query(`
      INSERT INTO pastoral_posts
        (
          title, excerpt, body, author_name,
          status, published_at, image_media_id, youtube_url
        )
      VALUES
        (
          $1, $2, $3, $4,
          $5,
          CASE WHEN $5 = 'published' THEN NOW() ELSE NULL END,
          $6, $7
        )
      RETURNING
        id, title, excerpt, body, author_name,
        status, published_at, created_at,
        image_media_id, youtube_url
    `, [
      title,
      excerpt,
      body,
      authorName,
      publish ? "published" : "draft",
      imageMediaId,
      youtubeUrl
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

function normalizeMusicYouTubeUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let videoId = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);

        if (["embed", "shorts", "live"].includes(parts[0])) {
          videoId = parts[1] || null;
        }
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return false;
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return false;
  }
}

adminApi.get("/music", async (_req, res, next) => {
  try {
    const [itemsResult, concertsResult] = await Promise.all([
      db.query(`
        SELECT
          id, item_type, title, description,
          media_id, youtube_url, sort_order,
          published, created_at, updated_at
        FROM music_items
        ORDER BY sort_order ASC, id DESC
      `),

      db.query(`
        SELECT
          id, title, starts_at, location,
          description, status, created_at, updated_at
        FROM concerts
        ORDER BY starts_at DESC
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

adminApi.post("/music/items", requireRole("admin"), async (req, res, next) => {
  try {
    const allowedTypes = new Set(["recording", "repertoire", "article"]);

    const itemType = String(req.body?.item_type || "").trim();
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const sortOrder = Number(req.body?.sort_order || 0);
    const published = Boolean(req.body?.published);

    const youtubeUrl = normalizeMusicYouTubeUrl(req.body?.youtube_url);

    if (!allowedTypes.has(itemType)) {
      return res.status(400).json({
        error: "Tipo de contenido musical inválido."
      });
    }

    if (!title) {
      return res.status(400).json({
        error: "Escribe un título."
      });
    }

    if (youtubeUrl === false) {
      return res.status(400).json({
        error: "La dirección de YouTube no es válida."
      });
    }

    const result = await db.query(`
      INSERT INTO music_items
        (
          item_type, title, description,
          youtube_url, sort_order, published
        )
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, item_type, title, description,
        youtube_url, sort_order, published,
        created_at, updated_at
    `, [
      itemType,
      title,
      description,
      youtubeUrl,
      Number.isFinite(sortOrder) ? sortOrder : 0,
      published
    ]);

    res.status(201).json({
      item: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

adminApi.patch("/music/items/:id/publish", requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const published = Boolean(req.body?.published);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      UPDATE music_items
      SET
        published = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id, item_type, title, description,
        youtube_url, sort_order, published,
        created_at, updated_at
    `, [id, published]);

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Contenido musical no encontrado."
      });
    }

    res.json({
      item: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

adminApi.delete("/music/items/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      DELETE FROM music_items
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Contenido musical no encontrado."
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

adminApi.post("/concerts", requireRole("admin"), async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    const startsAtRaw = String(req.body?.starts_at || "").trim();
    const location = String(req.body?.location || "").trim() || null;
    const description = String(req.body?.description || "").trim() || null;

    const allowedStatus = new Set([
      "scheduled",
      "cancelled",
      "completed"
    ]);

    const status = String(req.body?.status || "scheduled").trim();

    if (!title) {
      return res.status(400).json({
        error: "Escribe el nombre del concierto."
      });
    }

    const startsAt = new Date(startsAtRaw);

    if (!startsAtRaw || Number.isNaN(startsAt.getTime())) {
      return res.status(400).json({
        error: "Indica una fecha y hora válidas."
      });
    }

    if (!allowedStatus.has(status)) {
      return res.status(400).json({
        error: "Estado de concierto inválido."
      });
    }

    const result = await db.query(`
      INSERT INTO concerts
        (
          title, starts_at, location,
          description, status
        )
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        id, title, starts_at, location,
        description, status, created_at, updated_at
    `, [
      title,
      startsAt.toISOString(),
      location,
      description,
      status
    ]);

    res.status(201).json({
      concert: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

adminApi.delete("/concerts/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const result = await db.query(`
      DELETE FROM concerts
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Concierto no encontrado."
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
