process.on("uncaughtException", (err) => {
  console.error("?? UNCAUGHT EXCEPTION AL ARRANCAR:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("?? UNHANDLED REJECTION AL ARRANCAR:", reason);
});
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import OpenAI from "openai";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


import { fb } from "./utils/i18n";
import { subscriptionManager } from "./services/subscriptionManager";
import session from "express-session";
import passport from "./auth";
import authRoutes from "./authRoutes";

const app = express();

// ========== HEALTHCHECK SENCILLO ==========
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    source: "polyglot-point-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ========== SISTEMA DE MEMORIA SIMPLIFICADO ==========
interface Session {
  userId: string;
  ventana: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastAccess: number;
}

const sessions = new Map<string, Session>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_CLEANUP_MS = 5 * 60 * 1000;

// Limpieza automática cada 5 minutos
let cleanupInterval: NodeJS.Timeout | null = null;

function startSessionCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastAccess > SESSION_TIMEOUT_MS) {
        sessions.delete(id);
      }
    }
  }, SESSION_CLEANUP_MS);
}

startSessionCleanup();

function getOrCreateSession(userId: string): Session {
  const now = Date.now();
  
  if (sessions.size > 1000) {
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastAccess > SESSION_TIMEOUT_MS) {
        sessions.delete(id);
      }
    }
  }
  
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      ventana: [],
      lastAccess: now,
    });
  }
  
  const session = sessions.get(userId)!;
  session.lastAccess = now;
  return session;
}

function updateSession(userId: string, userMsg: string, assistantMsg: string): void {
  const session = getOrCreateSession(userId);
  session.ventana = [
    { role: 'user', content: userMsg },
    { role: 'assistant', content: assistantMsg }
  ];
  session.lastAccess = Date.now();
}

// ========== HELPERS ==========
function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}

function buildClaraPrompt(language: string): string {
  const LANG_MAP: Record<string, string> = {
    es: "español", en: "inglés", fr: "francés",
    it: "italiano", de: "alemán", pt: "portugués",
  };
  const targetLang = LANG_MAP[language] || "español";
  
  return `Clara es tutora de escritura. Corrige escribiendo bien dentro de la conversación.
Responde siempre en ${targetLang}. Voz: cálida, directa, culta.
Devuelve solo JSON: {"corrected":"...","explanations":[],"tips":[]}`;
}

// ========== PARSER INFALIBLE ==========
function parseClaraResponse(raw: string, fallback: string, language: string): {
  corrected: string;
  explanations: string[];
} {
  const clean = raw.trim();
  
  const extractionStrategies = [
    () => clean.match(/^\s*(\{[\s\S]*\})\s*$/)?.[1] || null,
    () => clean.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)?.[1] || null,
    () => {
      const start = clean.indexOf('{');
      if (start === -1) return null;
      let depth = 0;
      for (let i = start; i < clean.length; i++) {
        if (clean[i] === '{') depth++;
        if (clean[i] === '}') depth--;
        if (depth === 0) {
          let jsonStr = clean.slice(start, i + 1);
          const lastBrace = jsonStr.lastIndexOf('}');
          if (lastBrace !== jsonStr.length - 1) {
            jsonStr = jsonStr.slice(0, lastBrace + 1);
          }
          return jsonStr;
        }
      }
      return null;
    },
    () => {
      const matches = [...clean.matchAll(/\{[\s\S]*?\}/g)];
      return matches.length > 0 
        ? matches.reduce((a, b) => a[0].length > b[0].length ? a : b)[0]
        : null;
    }
  ];
  
  for (const strategy of extractionStrategies) {
    const jsonStr = strategy();
    if (!jsonStr) continue;
    
    try {
      const parsed = JSON.parse(jsonStr) as any;
      if (parsed?.corrected && typeof parsed.corrected === 'string') {
        const explanations = Array.isArray(parsed.explanations)
          ? parsed.explanations.slice(0, 1).filter((e: any) => typeof e === 'string')
          : [];
        
        return {
          corrected: parsed.corrected.trim(),
          explanations: explanations.map((e: string) => e.trim()),
        };
      }
    } catch {
      continue;
    }
  }
  
  return {
    corrected: fallback,
    explanations: [fb(language).PROCESS_ERROR || 'Error procesando respuesta'],
  };
}

// ========== VALIDACIÓN ==========
function validateChatRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: {
    input: string;
    language: string;
    userId: string;
    wasTrimmed: boolean;
    originalLength: number;
  };
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'invalid_request' };
  }
  
  const req = body as Record<string, unknown>;
  
  let language = 'es';
  if (typeof req.language === 'string') {
    const cleanLang = req.language.trim().toLowerCase();
    if (['es', 'en', 'fr', 'it', 'de', 'pt'].includes(cleanLang)) {
      language = cleanLang;
    }
  }
  
  const message = typeof req.message === 'string' ? req.message.trim() : '';
  const text = typeof req.text === 'string' ? req.text.trim() : '';
  const inputRaw = message || text;
  const originalLength = inputRaw.length;
  const input = inputRaw.slice(0, 280);
  const wasTrimmed = originalLength > 280;
  
  let userId = 'anonymous';
  if (typeof req.userId === 'string' && req.userId.trim()) {
    userId = req.userId.trim().slice(0, 100);
  }
  
  return {
    valid: true,
    data: { input, language, userId, wasTrimmed, originalLength },
  };
}

let openaiClient: OpenAI | null = null;

const getOpenAI = (): OpenAI => {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY no configurada");
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
};

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ========== AUTH SESSION ==========
app.use(session({
  secret: process.env.SESSION_SECRET || "polyglot-dev-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(authRoutes);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/chat") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 80)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ========== HANDLER CLARA 10/10 ==========
async function chatHandler(req: Request, res: Response) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const authUser = (req as any).user;
  
  res.setHeader('X-Request-ID', requestId);
  
  const validation = validateChatRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      corrected: '',
      explanations: [fb('es').NO_TEXT],
      language: 'es',
      status: validation.error,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  const { input, language, userId, wasTrimmed, originalLength } = validation.data;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] ${userId} ${language} ${originalLength}ch`);
  }
  
  const billingState = { hasBalance: true, remaining: undefined, dbFailed: false };
  
  if (authUser?.id) {
    try {
      const usage = await subscriptionManager.getUsage(authUser.id);
      billingState.remaining = usage.bank;
      billingState.hasBalance = usage.bank > 0;
      
      if (!billingState.hasBalance) {
        return res.status(403).json({
          corrected: '',
          explanations: [fb(language).NO_MESSAGES],
          language,
          status: 'no_messages',
          remainingMessages: 0,
          timestamp: new Date().toISOString(),
          requestId,
        });
      }
    } catch {
      billingState.dbFailed = true;
      billingState.hasBalance = false;
    }
  }
  
  const session = getOrCreateSession(userId);
  
  let rawResponse: string;
  try {
    const client = getOpenAI();
    const messages = [
      { role: 'system', content: buildClaraPrompt(language) },
      ...session.ventana,
      { role: 'user', content: input },
    ];
    
    const completion = await timeout(
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500,
        messages,
      }),
      10000
    );
    
    rawResponse = completion.choices[0]?.message?.content || '';
    
    if (!rawResponse.trim() || rawResponse.length > 10000) {
      throw new Error('Respuesta OpenAI inválida');
    }
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        type: 'openai_error',
        requestId,
        userId,
        language,
        error: error.message,
        time: responseTime,
      }));
    }
    
    return res.status(200).json({
      corrected: input,
      explanations: [fb(language).PROCESS_ERROR],
      language,
      status: 'openai_error',
      wasTrimmed,
      responseTime,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  const claraResponse = parseClaraResponse(rawResponse, input, language);
  
  if (authUser?.id && billingState.hasBalance && !billingState.dbFailed) {
    try {
      const result = await subscriptionManager.consumeMessage(authUser.id);
      billingState.remaining = result.remaining;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[${requestId}] billing_error: ${error.message}`);
      }
    }
  }
  
  setImmediate(() => {
    try {
      updateSession(userId, input, claraResponse.corrected);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[${requestId}] session_update_warn: ${error.message}`);
      }
    }
  });
  
  const responseTime = Date.now() - startTime;
  const response: any = {
    corrected: claraResponse.corrected,
    explanations: claraResponse.explanations,
    tips: [],
    language,
    status: 'ok',
    timestamp: new Date().toISOString(),
    responseTime,
    wasTrimmed,
    requestId,
  };
  
  if (authUser?.id && billingState.remaining !== undefined) {
    response.remainingMessages = billingState.remaining;
    if (billingState.remaining <= 5 && billingState.remaining > 0) {
      response.lowBalanceWarning = `Te quedan ${billingState.remaining} mensaje${billingState.remaining === 1 ? '' : 's'}`;
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      type: 'chat_request',
      requestId,
      userId,
      language,
      inputLength: originalLength,
      responseTime,
      status: 'ok',
      remaining: billingState.remaining,
    }));
  } else {
    console.log(`[${requestId}] ok ${responseTime}ms`);
  }
  
  return res.status(200).json(response);
}

// ========== RUTAS CHAT (AMBAS) ==========
app.post("/chat", chatHandler);
app.post("/api/chat", chatHandler);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`?? ?? serving on port ${PORT}`);
  });
})();