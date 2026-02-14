import type { Request, Response } from 'express';
import crypto from 'crypto';
import { ChatResponseSchema } from '../../shared/contracts/chat';
import { subscriptionManager } from '../services/subscriptionManager';
import { runClaraEngine } from '../clara/runClaraEngine';
import { fb } from '../utils/i18n';

// ============================================================================
// TIPOS (copiados del index.ts original)
// ============================================================================

type LangCode = "es" | "en" | "fr" | "it" | "de" | "pt";
type Role = "user" | "assistant";

interface ChatSession {
  key: string;
  ventana: Array<{ role: Role; content: string }>;
  lastAccess: number;
}

// ============================================================================
// ALMACENAMIENTO EN MEMORIA DE SESIONES
// ============================================================================

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

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

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
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

/**
 * POST /api/chat
 * Handler copiado exactamente del index.ts original (líneas 418-555)
 */
export async function chatHandler(req: Request, res: Response) {
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

  const bodySessionId = typeof (req.body as any).sessionId === "string" ? (req.body as any).sessionId.slice(0,64) : "";
  const sessionKey = authUser?.id ? `u:${authUser.id}` : bodySessionId ? `sid:${bodySessionId}` : req.sessionID ? `s:${req.sessionID}` : `anon:${clientUserId}`;

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

    const isProduction = process.env.NODE_ENV === "production";
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

  const isProduction = process.env.NODE_ENV === "production";
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
      console.error(JSON.stringify({ 
        type: "contract_violation", 
        requestId, 
        sessionKey, 
        language, 
        time: responseTime, 
        issues: parsedOut.error.issues 
      }));
    } else {
      console.error("[CONTRACT] ChatResponse inválido", parsedOut.error.issues);
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