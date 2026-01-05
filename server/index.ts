process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (reason) => console.error("UNHANDLED REJECTION:", reason));

import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import OpenAI from "openai";
import session from "express-session";

import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

import passport from "./auth";
import authRoutes from "./authRoutes";
import billingRoutes from "./routes/billing.routes";
import { fb } from "./utils/i18n";
import { subscriptionManager } from "./services/subscriptionManager";

const app = express();
app.set("etag", false);
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (isProduction ? crypto.randomBytes(32).toString("hex") : "polyglot-dev-secret-change-in-prod");

if (isProduction && !process.env.SESSION_SECRET) {
  console.error("[WARN] SESSION_SECRET faltante en producción; usando secreto efímero. Configura SESSION_SECRET en Railway.");
}

const vercelProjectSlug = (process.env.VERCEL_PROJECT_SLUG || "polyglot-point").trim();

const allowedExact = new Set(
  [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.VERCEL_PROD_URL,
    "http://localhost:5173",
    "https://polyglot-point-production.up.railway.app",
  ]
    .filter(Boolean)
    .map((s) => String(s).replace(/\/$/, ""))
);

const allowedPatterns: RegExp[] = [new RegExp(`^https:\\/\\/${vercelProjectSlug}(?:-[a-z0-9-]+)?\\.vercel\\.app$`, "i")];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const o = String(origin).replace(/\/$/, "");
      if (allowedExact.has(o)) return callback(null, true);
      if (allowedPatterns.some((re) => re.test(o))) return callback(null, true);
      console.warn("CORS bloqueado:", origin);
      return callback(new Error("CORS bloqueado"));
    },
    credentials: true,
  })
);

// Webhook Stripe - DEBE ir antes de express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Missing signature or secret" });
  }

  try {
    const { stripeService } = await import("./services/stripe.service");
    const event = stripeService.verifyWebhookSignature(req.body, sig);

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    // Manejar eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = parseInt(session.metadata?.userId, 10);
        const plan = session.metadata?.plan as "premium" | "pro";

        if (userId && plan) {
          const { db } = await import("./db");
          const { users, PLAN_CONFIG } = await import("../shared/schema");
          const { eq } = await import("drizzle-orm");
          console.log(`[Stripe Webhook] DEBUG: userId=${userId}, plan=${plan}, customer=${session.customer}, subscription=${session.subscription}`);
          const config = PLAN_CONFIG[plan];

          await db
            .update(users)
            .set({
              planType: plan,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              messagesBank: config.baseMessages,
              messagesUsedThisPeriod: 0,
              premiumMessagesToday: 0,
              premiumLastResetDate: new Date().toISOString().split("T")[0],
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          console.log(`[Stripe Webhook] User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const { db } = await import("./db");
        const { users } = await import("../shared/schema");
        const { eq } = await import("drizzle-orm");

        await db
          .update(users)
          .set({
            planType: "freemium",
            stripeSubscriptionId: null,
            messagesBank: 0,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeSubscriptionId, subscription.id));

        console.log(`[Stripe Webhook] Subscription ${subscription.id} deleted`);
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Error:", err.message);
    res.status(400).json({ error: "Webhook error" });
  }
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const sessionOptions: session.SessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
};

async function initRedisSessionStore(): Promise<void> {
  if (!process.env.REDIS_URL) {
    if (isProduction) console.warn("REDIS_URL no configurado en producción (MemoryStore no recomendado)");
    return;
  }

  try {
    const { RedisStore } = require("connect-redis");
    const { createClient } = require("redis");

    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (e: any) => console.error("Redis error:", e));
    await redisClient.connect();

    sessionOptions.store = new RedisStore({ client: redisClient, prefix: "polyglot:session:" });
    console.log("Session store: Redis (READY before session middleware)");
  } catch (e) {
    console.error("RedisStore init error:", e);
    console.warn("Fallback a MemoryStore");
  }
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    source: "polyglot-point-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    sessionConfigured: !!process.env.SESSION_SECRET,
    redisConfigured: !!process.env.REDIS_URL,
  });
});

type Role = "user" | "assistant";

interface ChatSession {
  key: string;
  ventana: Array<{ role: Role; content: string }>;
  lastAccess: number;
}

const chatSessions = new Map<string, ChatSession>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_CLEANUP_MS = 5 * 60 * 1000;

let cleanupInterval: NodeJS.Timeout | null = null;

function startSessionCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of chatSessions.entries()) {
      if (now - s.lastAccess > SESSION_TIMEOUT_MS) chatSessions.delete(id);
    }
  }, SESSION_CLEANUP_MS);
}

startSessionCleanup();

function getOrCreateChatSession(key: string): ChatSession {
  const now = Date.now();

  if (chatSessions.size > 1000) {
    for (const [id, s] of chatSessions.entries()) {
      if (now - s.lastAccess > SESSION_TIMEOUT_MS) chatSessions.delete(id);
    }
  }

  const existing = chatSessions.get(key);
  if (existing) {
    existing.lastAccess = now;
    return existing;
  }

  const created: ChatSession = { key, ventana: [], lastAccess: now };
  chatSessions.set(key, created);
  return created;
}

function updateChatSession(key: string, userMsg: string, assistantMsg: string): void {
  const s = getOrCreateChatSession(key);
  s.ventana.push({ role: "user", content: userMsg });
  s.ventana.push({ role: "assistant", content: assistantMsg });
  if (s.ventana.length > 6) s.ventana.splice(0, 2);
  s.lastAccess = Date.now();
}

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

function targetLanguageName(code: string): string {
  const LANG: Record<string, string> = {
    es: "español",
    en: "inglés",
    fr: "francés",
    it: "italiano",
    de: "alemán",
    pt: "portugués",
  };
  return LANG[code] || "español";
}

function buildClaraPrompt(language: string): string {
  const target = targetLanguageName(language);
  return `Eres Clara, tutora de ${target}. Corriges ligero dentro del dialogo como amiga culta. SOLO respondes en ${target}.

REGLAS:
1. SIEMPRE continua conversacion (1 pregunta/comentario natural)
2. Corrige TODOS los errores en el texto. 
3. Cierres VARIAN: pregunta/comentario/invita elaborar
4. Tono calido, directo. Sin emojis ni elogios vacios
5. Si mezcla idiomas: senalalo EN ${target}
6. NUNCA uses otro idioma para traducir. NUNCA inventes datos personales (edad, gustos)
7. Si NO hay errores, responde al contenido sin mencionar correcciones

JSON: {"corrected":"tu respuesta conversacional completa en ${target}"}`;
}

type ClaraParsed = { corrected: string };

function extractJsonCandidate(clean: string): string | null {
  const direct = clean.match(/^\s*(\{[\s\S]*\})\s*$/)?.[1];
  if (direct) return direct;

  const fenced = clean.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)?.[1];
  if (fenced) return fenced;

  const start = clean.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) return clean.slice(start, i + 1);
    }
  }

  const matches = [...clean.matchAll(/\{[\s\S]*?\}/g)];
  if (matches.length) {
    let best = matches[0][0];
    for (const m of matches) if (m[0].length > best.length) best = m[0];
    return best;
  }

  return null;
}

function parseClaraResponse(raw: string, fallback: string): ClaraParsed {
  const clean = (raw || "").trim();
  const jsonStr = extractJsonCandidate(clean);

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr) as any;
      if (typeof parsed?.corrected === "string" && parsed.corrected.trim()) {
        return { corrected: parsed.corrected.trim() };
      }
    } catch {}
  }

  return { corrected: fallback };
}

function readLangFromBody(req: Record<string, unknown>): string {
  const cand =
    (typeof (req as any).language === "string" && (req as any).language) ||
    (typeof (req as any).activeLanguage === "string" && (req as any).activeLanguage) ||
    "";

  const l = String(cand || "").trim().toLowerCase();
  return ["es", "en", "fr", "it", "de", "pt"].includes(l) ? l : "es";
}

function validateChatRequest(body: unknown): {
  valid: boolean;
  error?: "invalid_request" | "no_text";
  data?: { input: string; language: string; clientUserId: string; wasTrimmed: boolean; originalLength: number };
} {
  if (!body || typeof body !== "object") return { valid: false, error: "invalid_request" };
  const req = body as Record<string, unknown>;

  const language = readLangFromBody(req);

  const message = typeof (req as any).message === "string" ? String((req as any).message).trim() : "";
  const text = typeof (req as any).text === "string" ? String((req as any).text).trim() : "";
  const inputRaw = message || text;

  if (!inputRaw) return { valid: false, error: "no_text" };

  const originalLength = inputRaw.length;
  const input = inputRaw.slice(0, 280);
  const wasTrimmed = originalLength > 280;

  const clientUserId =
    typeof (req as any).userId === "string" && String((req as any).userId).trim()
      ? String((req as any).userId).trim().slice(0, 100)
      : "anonymous";

  return { valid: true, data: { input, language, clientUserId, wasTrimmed, originalLength } };
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  const key = process.env.OPENAI_API_KEY || process.env.POLYGLOT_OPENAI_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada");
  openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  const originalJson = res.json.bind(res);
  let captured: any;

  res.json = ((body: any) => {
    captured = body;
    return originalJson(body);
  }) as any;

  res.on("finish", () => {
    if (!path.startsWith("/api") && path !== "/chat") return;
    const duration = Date.now() - start;
    const preview = captured ? JSON.stringify(captured).slice(0, 80) : "";
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms${preview ? " :: " + preview : ""}`);
  });

  next();
});

async function chatHandler(req: Request, res: Response) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  res.setHeader("X-Request-ID", requestId);

  const validation = validateChatRequest(req.body);
  if (!validation.valid) {
    const safeLang = req.body && typeof req.body === "object" ? readLangFromBody(req.body as any) : "es";
    return res.status(400).json({
      corrected: "",
      explanations: [fb(safeLang).NO_TEXT],
      tips: [],
      language: safeLang,
      status: validation.error,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  const { input, language, clientUserId, wasTrimmed, originalLength } = validation.data!;
  const authUser = (req as any).user;

  const sessionKey =
    authUser?.id ? `u:${authUser.id}` : req.sessionID ? `s:${req.sessionID}` : `anon:${clientUserId}`;

  const billingState: { remaining?: number; dbFailed: boolean } = { dbFailed: false };

  if (authUser?.id) {
    try {
      const usage = await subscriptionManager.getUsage(authUser.id);
      billingState.remaining = usage.bank;

      if (usage.bank <= 0) {
        return res.status(403).json({
          corrected: "",
          explanations: [fb(language).NO_MESSAGES],
          tips: [],
          language,
          status: "no_messages",
          remainingMessages: 0,
          timestamp: new Date().toISOString(),
          requestId,
        });
      }
    } catch {
      billingState.dbFailed = true;
    }
  }

  const chatSession = getOrCreateChatSession(sessionKey);

  let rawResponse = "";

  try {
    const client = getOpenAI();

    const historial = chatSession.ventana.slice(-6);
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: buildClaraPrompt(language) },
    ];
    for (const msg of historial) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
    messages.push({ role: "user", content: input });
    console.log("[CLARA DEBUG] messages count:", messages.length, "historial:", historial.length);
    const completion = await timeout(
      client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 600,
        messages: messages,
        response_format: { type: "json_object" },
      }),
      25000
    );

    rawResponse = completion.choices[0]?.message?.content || "";
    console.log("[CLARA DEBUG] rawResponse:", rawResponse.substring(0, 200));
    if (!rawResponse.trim() || rawResponse.length > 10000) throw new Error("Respuesta OpenAI inválida");
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (isProduction) {
      console.error(
        JSON.stringify({
          type: "openai_error",
          requestId,
          sessionKey,
          language,
          error: error?.message || String(error),
          time: responseTime,
        })
      );
    }

    return res.status(200).json({
      corrected: input,
      explanations: [fb(language).PROCESS_ERROR],
      tips: [],
      language,
      status: "openai_error",
      wasTrimmed,
      responseTime,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  const clara = parseClaraResponse(rawResponse, input);

  if (authUser?.id && !billingState.dbFailed) {
    try {
      const result = await subscriptionManager.consumeMessage(authUser.id);
      billingState.remaining = result.remaining;
    } catch {
      billingState.dbFailed = true;
    }
  }

  setImmediate(() => {
    try {
      updateChatSession(sessionKey, input, clara.corrected);
    } catch {}
  });

  const responseTime = Date.now() - startTime;

  const response: any = {
    corrected: clara.corrected,
    explanations: [],
    tips: [],
    language,
    status: billingState.dbFailed ? "billing_degraded" : "ok",
    timestamp: new Date().toISOString(),
    responseTime,
    wasTrimmed,
    requestId,
  };

  if (billingState.dbFailed) response.billingDegraded = true;

  if (authUser?.id && billingState.remaining !== undefined) {
    response.remainingMessages = billingState.remaining;
    if (billingState.remaining > 0 && billingState.remaining <= 5) {
      response.lowBalanceWarning = `Te quedan ${billingState.remaining} mensaje${billingState.remaining === 1 ? "" : "s"}`;
    }
  }

  if (isProduction) {
    console.log(
      JSON.stringify({
        type: "chat_request",
        requestId,
        sessionKey,
        language,
        inputLength: originalLength,
        responseTime,
        status: response.status,
        remaining: billingState.remaining,
        dbFailed: billingState.dbFailed,
      })
    );
  }

  return res.status(200).json(response);
}

(async () => {
  await initRedisSessionStore();

  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/api/chat", chatHandler);

  app.use("/auth", authRoutes);
  app.use("/api", billingRoutes);

  app.get("/api/me", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Vary", "Cookie");

    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const user = req.user as any;
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        planType: user.planType || "freemium",
        messagesBank: user.messagesBank ?? 20,
        remainingMessages: user.messagesBank ?? 20,
      });
      return;
    }

    res.status(401).json({ error: "No autenticado" });
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
      req.session.destroy((err2) => {
        if (err2) return res.status(500).json({ error: "Error destruyendo sesión" });
        res.clearCookie("connect.sid", {
          path: "/",
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          httpOnly: true,
        });
        res.json({ message: "Sesión cerrada" });
      });
    });
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    console.error("[EXPRESS_ERROR]", err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 3000;

  server.listen(PORT, "0.0.0.0", () => {
    console.log("SERVIDOR INICIADO en puerto " + PORT);
    console.log("NODE_ENV: " + (process.env.NODE_ENV || "development"));
    console.log("SESSION_SECRET configurado: " + !!process.env.SESSION_SECRET);
    console.log("REDIS_URL configurado: " + !!process.env.REDIS_URL);
    if ((sessionOptions as any).store) console.log("Session store: Redis (attached)");
  });
})().catch((e) => {
  console.error("BOOTSTRAP FAILED:", e);
  process.exit(1);
});
