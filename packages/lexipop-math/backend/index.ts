import "dotenv/config";

process.on("uncaughtException",  (err)    => console.error("UNCAUGHT EXCEPTION:",  err));
process.on("unhandledRejection", (reason) => console.error("UNHANDLED REJECTION:", reason));

import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth";
import authRoutes from "./authRoutes";
import mathRoutes from "./api-routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.set("etag", false);

const isProduction = process.env.NODE_ENV === "production";

// ─── Trust proxy (Railway sits behind one) ───────────────────────────────────
app.set("trust proxy", 1);

// ─── Canonical redirect ───────────────────────────────────────────────────────
const CANONICAL_HOST = process.env.CANONICAL_HOST || "www.lexipopmath.com";
app.use((req, res, next) => {
  const host  = String(req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  if (isProduction && host && host !== CANONICAL_HOST) {
    return res.redirect(301, `${proto}://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedExact = new Set(
  [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    `https://${CANONICAL_HOST}`,
  ]
    .filter(Boolean)
    .map((s) => String(s).replace(/\/$/, ""))
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const o = String(origin).replace(/\/$/, "");
      if (allowedExact.has(o)) return callback(null, true);
      console.warn("[CORS] Bloqueado:", origin);
      return callback(new Error("CORS bloqueado"));
    },
    credentials: true,
  })
);

// ─── Session ──────────────────────────────────────────────────────────────────
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (isProduction
    ? crypto.randomBytes(32).toString("hex")
    : "lexipop-math-dev-secret-change-in-prod");

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn("[WARN] SESSION_SECRET ausente en producción — configúrala en Railway.");
}

const sessionOptions: session.SessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    httpOnly: true,
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 días
  },
};

async function initRedisSessionStore(): Promise<void> {
  if (!process.env.REDIS_URL) {
    if (isProduction) console.warn("[WARN] REDIS_URL no configurado (MemoryStore no recomendado en prod).");
    return;
  }
  try {
    const { RedisStore } = require("connect-redis");
    const { createClient } = require("redis");
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (e: any) => console.error("[Redis]", e));
    await redisClient.connect();
    sessionOptions.store = new RedisStore({ client: redisClient, prefix: "lm:session:" });
    console.log("[Session] Redis listo.");
  } catch (e) {
    console.error("[Redis] Init fallido, usando MemoryStore:", e);
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status:            "ok",
    app:               "lexipop-math",
    timestamp:         new Date().toISOString(),
    environment:       process.env.NODE_ENV || "development",
    sessionConfigured: !!process.env.SESSION_SECRET,
    redisConfigured:   !!process.env.REDIS_URL,
    openaiConfigured:  !!process.env.OPENAI_API_KEY,
    googleOAuthReady:  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const path  = req.path;
  res.on("finish", () => {
    if (!path.startsWith("/api") && !path.startsWith("/auth")) return;
    log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
  });
  next();
});

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Bootstrap ───────────────────────────────────────────────────────────────
(async () => {
  await initRedisSessionStore();

  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Auth routes  (/auth/google, /auth/google/callback, /auth/logout)
  app.use("/auth", authRoutes);

  // ── Math API routes  (/api/health, /api/help)
  app.use("/api", mathRoutes);

  // ── Me endpoint
  app.get("/api/me", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.json({ id: user.id, email: user.email, name: user.name });
    }
    res.status(401).json({ error: "No autenticado" });
  });

  // ── Logout
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
      req.session.destroy((err2) => {
        if (err2) return res.status(500).json({ error: "Error destruyendo sesión" });
        res.clearCookie("connect.sid", {
          path:     "/",
          secure:   isProduction,
          sameSite: isProduction ? "none" : "lax",
          httpOnly: true,
        });
        res.json({ message: "Sesión cerrada" });
      });
    });
  });

  // ── Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status  = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("[EXPRESS_ERROR]", err);
    res.status(status).json({ message });
  });

  // ── Vite / static frontend
  if (app.get("env") === "development") {
    const http = await import("http");
    const server = http.createServer(app);
    await setupVite(app, server);
    const PORT = Number(process.env.PORT) || 3001;
    server.listen(PORT, "0.0.0.0", () => logBoot(PORT));
  } else {
    serveStatic(app);
    const PORT = Number(process.env.PORT) || 3001;
    app.listen(PORT, "0.0.0.0", () => logBoot(PORT));
  }
})().catch((e) => {
  console.error("[BOOTSTRAP FAILED]", e);
  process.exit(1);
});

function logBoot(port: number) {
  console.log(`[LexiPop Math] Servidor en puerto ${port}`);
  console.log(`[LexiPop Math] NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`[LexiPop Math] SESSION_SECRET: ${!!process.env.SESSION_SECRET}`);
  console.log(`[LexiPop Math] OPENAI_API_KEY:  ${!!process.env.OPENAI_API_KEY}`);
}