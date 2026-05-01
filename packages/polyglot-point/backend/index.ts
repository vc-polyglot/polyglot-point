import "dotenv/config";
import { healthCheck } from "./health";
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (reason) => console.error("UNHANDLED REJECTION:", reason));


// FASE4 CONTRACT: fb() exige LangCode validado
type LangCode = "es" | "en" | "fr" | "it" | "de" | "pt";
import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";


import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


import passport from "./auth";
import authRoutes from "./authRoutes";
import billingRoutes from "./routes/billing.routes";
import { fb } from "./utils/i18n";
import { subscriptionManager } from "./services/subscriptionManager";
import { ChatResponseSchema } from "@shared/contracts/chat";
import { runClaraEngine } from "./clara/runClaraEngine";
const app = express();
app.set("etag", false);
const isProduction = process.env.NODE_ENV === "production";


app.set("trust proxy", 1);

// Canonical domain (force www in production)
const CANONICAL_HOST = "www.polyglotpoint.com";
app.use((req, res, next) => {
  // EXCEPCI�N: Stripe webhooks no deben redirigirse (Stripe no sigue redirects)
  if (req.path === "/api/stripe/webhook") {
    return next();
  }

  const host = String(req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");

  if (process.env.NODE_ENV === "production" && host && host !== CANONICAL_HOST) {
    return res.redirect(301, `${proto}://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});


const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (isProduction ? crypto.randomBytes(32).toString("hex") : "polyglot-dev-secret-change-in-prod");


if (isProduction && !process.env.SESSION_SECRET) {
  console.error(
    "[WARN] SESSION_SECRET faltante en producciÃ³n; usando secreto efÃ­mero. Configura SESSION_SECRET en Railway."
  );
}


const vercelProjectSlug = (process.env.VERCEL_PROJECT_SLUG || "polyglot-point").trim();


const allowedExact = new Set(
  [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.VERCEL_PROD_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "https://polyglotpoint.com",
    "https://www.polyglotpoint.com",
    "capacitor://localhost",
    "https://localhost",
  ]
    .filter(Boolean)
    .map((s) => String(s).replace(/\/$/, ""))
);


const allowedPatterns: RegExp[] = [
  new RegExp(`^https:\\/\\/${vercelProjectSlug}(?:-[a-z0-9-]+)?\\.vercel\\.app$`, "i"),
];


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


app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;


  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Missing signature or secret" });
  }


  try {
    const { stripeService } = await import("./services/stripe.service");
    const event = stripeService.verifyWebhookSignature(req.body, sig);


    console.log(`[Stripe Webhook] Event: ${event.type}`);


    switch (event.type) {
      case "checkout.session.completed": {
        const sessionObj = event.data.object as any;
        const userId = parseInt(sessionObj.metadata?.userId, 10);
        const plan = sessionObj.metadata?.plan as "premium" | "pro";


        if (userId && plan) {
          const { db } = await import("./db");
          const { users, PLAN_CONFIG } = await import("../shared/schema");
          const { eq } = await import("drizzle-orm");


          console.log(
            `[Stripe Webhook] DEBUG: userId=${userId}, plan=${plan}, customer=${sessionObj.customer}, subscription=${sessionObj.subscription}`
          );


          const config = PLAN_CONFIG[plan];


          await db
            .update(users)
            .set({
              planType: plan,
              stripeCustomerId: sessionObj.customer,
              stripeSubscriptionId: sessionObj.subscription,
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
    if (isProduction) console.warn("REDIS_URL no configurado en producciÃ³n (MemoryStore no recomendado)");
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
      googleOAuthEnabled: Boolean((process.env.GOOGLE_CLIENT_ID_X || process.env.GOOGLE_CLIENT_ID) && (process.env.GOOGLE_CLIENT_SECRET_X || process.env.GOOGLE_CLIENT_SECRET)),
      googleClientIdLength: (process.env.GOOGLE_CLIENT_ID_X || process.env.GOOGLE_CLIENT_ID)?.length || 0,
      googleClientSecretLength: (process.env.GOOGLE_CLIENT_SECRET_X || process.env.GOOGLE_CLIENT_SECRET)?.length || 0,
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
  if (s.ventana.length > 10) s.ventana.splice(0, 2);
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
    es: "espaÃ±ol",
    en: "inglÃ©s",
    fr: "francÃ©s",
    it: "italiano",
    de: "alemÃ¡n",
    pt: "portuguÃ©s",
  };
  return LANG[code] || "espaÃ±ol";
}function readLangFromBody(req: Record<string, unknown>): string {
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


  const inputFromBody = typeof (req as any).input === "string" ? String((req as any).input).trim() : "";
  const message = typeof (req as any).message === "string" ? String((req as any).message).trim() : "";
  const text = typeof (req as any).text === "string" ? String((req as any).text).trim() : "";
  const inputRaw = inputFromBody || message || text;


  if (!inputRaw) return { valid: false, error: "no_text" };


  const originalLength = inputRaw.length;
  const input = inputRaw.slice(0, 280);
  const wasTrimmed = originalLength > 280;


  const clientUserId =
    typeof (req as any).userId === "string" && String((req as any).userId).trim()
      ? String((req as any).userId).trim().slice(0, 100)
      : "anonymous";


  return { valid: true, data: { input, language, clientUserId, wasTrimmed, originalLength } };
}app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (!path.startsWith("/api") && path !== "/chat") return;
    const duration = Date.now() - start;
    // PRIVACIDAD: nunca loggear bodies en server logs
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
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
      claraResponse: "",
      corrected: "",
      explanations: [fb(safeLang as LangCode).NO_TEXT],
      tips: [],
      language: safeLang,
      status: validation.error,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }


  const { input, language, clientUserId, wasTrimmed, originalLength } = validation.data!;
  const authUser = (req as any).user;


  const bodySessionId = typeof (req.body as any).sessionId === "string" ? (req.body as any).sessionId.slice(0,64) : ""; const sessionKey = authUser?.id ? `u:${authUser.id}` : bodySessionId ? `sid:${bodySessionId}` : req.sessionID ? `s:${req.sessionID}` : `anon:${clientUserId}`;


  const billingState: { remaining?: number; dbFailed: boolean } = { dbFailed: false };


  if (authUser?.id) {
    try {
      const usage = await subscriptionManager.getUsage(authUser.id);
      billingState.remaining = usage.bank;


      if (usage.bank <= 0) {
        return res.status(403).json({
          claraResponse: "",
          corrected: "",
          explanations: [fb(language as LangCode).NO_MESSAGES],
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


  let claraText = "";
  let llmOk = false;
  try {
    const historial = chatSession.ventana;


    const engineOut = await runClaraEngine({
      input,
      language,
      history: historial,
    });


    rawResponse = engineOut.cleaned;
    claraText = engineOut.response;


    llmOk = true;
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
      claraResponse: "",
      corrected: "",
      explanations: [fb(language as LangCode).PROCESS_ERROR],
      tips: [],
      language,
      status: "openai_error",
      wasTrimmed,
      responseTime,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  const clara = { response: claraText };
  if (authUser?.id && !billingState.dbFailed) {
    try {
      const result = await subscriptionManager.consumeMessage(authUser.id);
      billingState.remaining = result.remaining;
    } catch {
      billingState.dbFailed = true;
    }
  }


  if (llmOk) {
    setImmediate(() => {
      try {
        updateChatSession(sessionKey, input, clara.response);
      } catch {}
    });
  }


  const responseTime = Date.now() - startTime;


  const response: any = {
    claraResponse: clara.response,
    corrected: "",
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


  const parsedOut = ChatResponseSchema.safeParse(response);
  if (!parsedOut.success) {
    const responseTime = Date.now() - startTime;
    if (isProduction) {
      console.error(JSON.stringify({ type: "contract_violation", requestId, sessionKey, language, time: responseTime, issues: parsedOut.error.issues }));
    } else {
      console.error("[CONTRACT] ChatResponse invï¿½lido", parsedOut.error.issues);
    }
    return res.status(500).json({
      claraResponse: "",
      corrected: "",
      explanations: [fb(language as LangCode).PROCESS_ERROR],
      tips: [],
      language,
      status: "openai_error",
      timestamp: new Date().toISOString(),
      requestId,
    });
  }


  return res.status(200).json(parsedOut.data);
}


(async () => {
  await initRedisSessionStore();


    const devBypass = !isProduction && process.env.DEV_BYPASS_AUTH === "1";


  app.use(session(sessionOptions));
  app.use(passport.initialize());


  if (!devBypass) {
    app.use(passport.session());
  } else {
    console.log("[DEV] DEV_BYPASS_AUTH activo: inyectando usuario mock y desactivando passport.session()");
    app.use((req: Request, _res: Response, next: NextFunction) => {
      // Usuario mock SOLO para desarrollo local. Sin id para evitar billing/DB.
      (req as any).user = {
        isDevMock: true,
        email: "dev@local",
        name: "Dev User",
        planType: "pro",
        messagesBank: 999999,
      };
      next();
    });
  }


  app.post("/api/chat", chatHandler);


  app.use("/api/auth", authRoutes);
  app.use("/api", billingRoutes);


  app.get("/api/me", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("Vary", "Cookie");


  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;


    const devProEmail = (process.env.PP_DEV_PRO_EMAIL || "").toLowerCase();
    const isDev = process.env.NODE_ENV !== "production";
    const isDevPro = isDev && devProEmail && (user.email || "").toLowerCase() === devProEmail;


    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      planType: isDevPro ? "pro" : (user.planType || "freemium"),
      messagesBank: isDevPro ? 0 : (user.messagesBank ?? 20),
      remainingMessages: isDevPro ? 0 : (user.messagesBank ?? 20),
    });
    return;
  }


  res.status(401).json({ error: "No autenticado" });
});app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Error al cerrar sesiÃ³n" });
      req.session.destroy((err2) => {
        if (err2) return res.status(500).json({ error: "Error destruyendo sesiÃ³n" });
        res.clearCookie("connect.sid", {
          path: "/",
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          httpOnly: true,
        });
        res.json({ message: "SesiÃ³n cerrada" });
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
app.get('/healthz', healthCheck);



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




























