import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import helmet from "helmet";
import compression from "compression";

import { env, isProduction } from "./config/env.js";
import { db } from "./lib/db.js";
import { redisClient, connectRedis } from "./lib/redis.js";
import { publicApi } from "./routes/public-api.js";
import { adminAuth } from "./routes/admin-auth.js";
import { adminApi } from "./routes/admin-api.js";
import { requireAuth } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

await connectRedis();

const app = express();

app.set("trust proxy", env.trustProxy);
app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use(session({
  name: "sanIgnacio.sid",
  store: new RedisStore({
    client: redisClient,
    prefix: "san-ignacio:sess:"
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000
  }
}));

app.get("/health", async (_req, res) => {
  try {
    const dbResult = await db.query("SELECT NOW() AS now");
    const redisResult = await redisClient.ping();

    res.json({
      ok: true,
      postgres: Boolean(dbResult.rows[0]?.now),
      redis: redisResult === "PONG"
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error.message
    });
  }
});

app.use("/api", publicApi);
app.use("/api/admin", adminAuth);
app.use("/api/admin", adminApi);

app.get("/admin", (_req, res) => {
  if (_req.session?.user) {
    return res.redirect("/admin/dashboard");
  }
  res.sendFile(path.join(rootDir, "public", "admin", "login.html"));
});

app.get("/admin/dashboard", requireAuth, (_req, res) => {
  res.sendFile(path.join(rootDir, "private", "admin-dashboard.html"));
});

app.use("/admin-assets", express.static(path.join(rootDir, "public", "admin"), {
  fallthrough: false,
  maxAge: isProduction ? "1h" : 0
}));

app.use(express.static(path.join(rootDir, "public"), {
  index: "index.html",
  maxAge: isProduction ? "1h" : 0
}));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Ruta no encontrada." });
  }
  res.status(404).sendFile(path.join(rootDir, "public", "404.html"));
});

app.use((error, req, res, _next) => {
  console.error(error);

  if (req.path.startsWith("/api/")) {
    return res.status(500).json({
      error: isProduction ? "Error interno." : error.message
    });
  }

  res.status(500).send("Error interno.");
});

const server = app.listen(env.port, () => {
  console.log(`San Ignacio escuchando en puerto ${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal}: cerrando servicio...`);
  server.close(async () => {
    await Promise.allSettled([
      db.end(),
      redisClient.quit()
    ]);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
