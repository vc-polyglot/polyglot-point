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

// â”€â”€â”€ Trust proxy (Railway sits behind one) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.set("trust proxy", 1);

// â”€â”€â”€ Canonical redirect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CANONICAL_HOST = process.env.CANONICAL_HOST || "www.lexipopmath.com";
app.use((req, res, next) => {
  const host  = String(req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  if (isProduction && host && host !== CANONICAL_HOST) {
    return res.redirect(301, `${proto}://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

// â”€â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (isProduction
    ? crypto.randomBytes(32).toString("hex")
    : "lexipop-math-dev-secret-change-in-prod");

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn("[WARN] SESSION_SECRET ausente en producciÃ³n â€” configÃºrala en Railway.");
}

const sessionOptions: session.SessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    httpOnly: true,
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 dÃ­as
  },
};

async function initRedisSessionStore(): Promise<void> {
  if (!process.env.REDIS_URL) {
    if (isProduction) console.warn("[WARN] REDIS_URL no configurado (MemoryStore no recomendado en prod).");
    return;
  }
  try {
    const RedisStore = require("connect-redis").default;
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

// â”€â”€â”€ Health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Privacy Policy
app.get("/privacy", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Politica de Privacidad - LexiPop Math</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #e8f0fe; color: #1a1a2e; min-height: 100vh; padding: 40px 20px; }
  .card { background: white; max-width: 760px; margin: 0 auto; border-radius: 20px; padding: 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .logo { text-align: center; margin-bottom: 32px; }
  .logo img { width: 72px; }
  .logo h1 { font-size: 1.6rem; color: #1a1a2e; margin-top: 8px; }
  h2 { font-size: 1.1rem; color: #3b5bdb; margin: 28px 0 10px; }
  p, li { font-size: 0.95rem; line-height: 1.7; color: #333; }
  ul { padding-left: 20px; margin-top: 8px; }
  li { margin-bottom: 6px; }
  .footer { text-align: center; margin-top: 32px; font-size: 0.8rem; color: #888; }
  a { color: #3b5bdb; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <img src="/lexipop-logo.png" alt="LexiPop Math" />
    <h1>LexiPop Math</h1>
  </div>
  <h2>Politica de Privacidad</h2>
  <p><strong>Ultima actualizacion:</strong> 19 de marzo de 2026</p>
  <p style="margin-top:12px">LexiPop Math recopila unicamente la informacion necesaria para operar el servicio. No vendemos ni compartimos tus datos con terceros.</p>
  <h2>Datos que recopilamos</h2>
  <ul>
    <li>Nombre y correo electronico (via Google OAuth)</li>
    <li>Progreso en ejercicios matematicos</li>
    <li>Informacion de suscripcion (procesada por Stripe)</li>
  </ul>
  <h2>Uso de los datos</h2>
  <p>Usamos tus datos unicamente para identificarte, guardar tu progreso y gestionar tu suscripcion. Nunca los vendemos ni compartimos con terceros.</p>
  <h2>Eliminacion de cuenta</h2>
  <p>Puedes solicitar la eliminacion de tu cuenta y datos en cualquier momento escribiendo a <a href="mailto:polyglotpoint@gmail.com">polyglotpoint@gmail.com</a>.</p>
  <h2>Contacto</h2>
  <p><a href="mailto:polyglotpoint@gmail.com">polyglotpoint@gmail.com</a></p>
  <div class="footer">LexiPop Studio &copy; 2026</div>
</div>
</body></html>`);
});
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

// â”€â”€â”€ Request logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use((req, res, next) => {
  const start = Date.now();
  const path  = req.path;
  res.on("finish", () => {
    if (!path.startsWith("/api") && !path.startsWith("/auth")) return;
    log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
  });
  next();
});

// â”€â”€â”€ Body parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use('/api/math/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// â”€â”€â”€ Bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(async () => {
  await initRedisSessionStore();

  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // â”€â”€ Auth routes  (/auth/google, /auth/google/callback, /auth/logout)
  app.use("/auth", authRoutes);

  // â”€â”€ Math API routes  (/api/health, /api/help)
  app.use("/api/math", mathRoutes);

  // â”€â”€ Me endpoint
  app.get("/api/me", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.json({ id: user.id, email: user.email, name: user.name });
    }
    res.status(401).json({ error: "No autenticado" });
  });

  // â”€â”€ Logout
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Error al cerrar sesiÃ³n" });
      req.session.destroy((err2) => {
        if (err2) return res.status(500).json({ error: "Error destruyendo sesiÃ³n" });
        res.clearCookie("connect.sid", {
          path:     "/",
          secure:   isProduction,
          sameSite: isProduction ? "none" : "lax",
          httpOnly: true,
        });
        res.json({ message: "SesiÃ³n cerrada" });
      });
    });
  });

  // â”€â”€ Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status  = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("[EXPRESS_ERROR]", err);
    res.status(status).json({ message });
  });

  // â”€â”€ Vite / static frontend
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

