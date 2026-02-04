import OpenAI from "openai";
import { buildClaraPrompt as buildClaraPromptModular } from "../prompts/builder";
import { inferIntent } from "../services/intent-classifier";
import { validateText } from "../services/languagetool.service";

type HistoryMsg = { role: "system" | "user" | "assistant"; content: string };

export type EngineVariant = "legacy" | "modular";
export type AllowedLanguage = "es" | "en" | "fr" | "it" | "de" | "pt";

export type RunClaraEngineInput = {
  input: string;
  language: string;
  history: Array<{ role: string; content: string }>;
  engineVariant?: EngineVariant;
};

export type RunClaraEngineDeps = Readonly<{
  openaiClient?: OpenAI;
}>;

export type RunClaraEngineOutput = {
  raw: string;
  cleaned: string;
  response: string;
  engine: EngineVariant;
  language: AllowedLanguage;
};

let openaiClientSingleton: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClientSingleton) return openaiClientSingleton;
  const key = process.env.OPENAI_API_KEY || process.env.POLYGLOT_OPENAI_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada");
  openaiClientSingleton = new OpenAI({ apiKey: key });
  return openaiClientSingleton;
}

function getEnvInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

function getEnvFloat(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function debugEnabled(): boolean {
  return String(process.env.CLARA_ENGINE_DEBUG || "").trim() === "1";
}

function normalizeLanguage(v: string): AllowedLanguage {
  const s = String(v || "").trim().toLowerCase();
  return (["es", "en", "fr", "it", "de", "pt"] as const).includes(s as AllowedLanguage)
    ? (s as AllowedLanguage)
    : "es";
}

function parseEngineVariant(v: string): EngineVariant {
  const s = String(v || "").trim().toLowerCase();
  if (s === "modular") return "modular";
  if (s === "legacy") return "legacy";

  if (debugEnabled()) {
    console.warn(`[ClaraEngine] Variante desconocida: "${String(v)}", usando "legacy"`);
  }
  return "legacy";
}

function parseClaraResponse(raw: string): { response: string } {
  return { response: (raw || "").trim() };
}

function validateClaraRaw(raw: string): { ok: boolean; cleaned: string } {
  let cleaned = (raw || "").trim();
  if (!cleaned) return { ok: false, cleaned: "" };

  if (cleaned.startsWith('{"corrected":') || cleaned.startsWith("```json")) {
    return { ok: false, cleaned: "" };
  }

  if (cleaned.length > 4000) cleaned = cleaned.slice(0, 4000).trim();
  return { ok: true, cleaned };
}

async function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  const killer = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, killer]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function toHistoryMsgArray(history: Array<{ role: string; content: string }>): HistoryMsg[] {
  const out: HistoryMsg[] = [];
  for (const msg of history || []) {
    const role = String(msg?.role || "").trim().toLowerCase();
    if (role !== "system" && role !== "user" && role !== "assistant") continue;
    const content = String(msg?.content || "");
    out.push({ role: role as "user" | "assistant", content });
  }
  return out;
}

export async function runClaraEngine(
  input: RunClaraEngineInput,
  deps?: RunClaraEngineDeps
): Promise<RunClaraEngineOutput> {
  if (!input || !String(input.input || "").trim()) throw new Error("Input vacío");

  const client = deps?.openaiClient ?? getOpenAI();
  const language = normalizeLanguage(input.language);

  const history = toHistoryMsgArray(input.history).slice(-10);

  const engine: EngineVariant = input.engineVariant
    ? input.engineVariant
    : parseEngineVariant(process.env.CLARA_ENGINE || "legacy");

  let intent: any = "unknown";
  try {
    intent = inferIntent({ input: input.input, language });
  } catch {
    if (debugEnabled()) console.warn("[ClaraEngine] inferIntent error, using intent=unknown");
  }

  if (debugEnabled()) {
    console.log(`[ClaraEngine] engine=${engine} lang=${language} intent=${String(intent)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🔥 VALIDACIÓN CON LANGUAGETOOL
  // ═══════════════════════════════════════════════════════════════════════
  let validatedErrors: any[] = [];
  try {
    validatedErrors = await validateText(input.input, language);
    if (debugEnabled() && validatedErrors.length > 0) {
      console.log(`[ClaraEngine] LanguageTool found ${validatedErrors.length} errors:`, 
        validatedErrors.map(e => `${e.original}→${e.corrected}`));
    }
  } catch (err) {
    if (debugEnabled()) {
      console.warn("[ClaraEngine] LanguageTool error, continuing without corrections:", err);
    }
    validatedErrors = [];
  }
  // ═══════════════════════════════════════════════════════════════════════

  const systemPrompt =
    engine === "modular"
      ? buildClaraPromptModular(
          {
            intent,
            targetLanguage: language,
            userMessage: input.input,
            conversationHistory: history,
          },
          validatedErrors
        )
      : buildClaraPromptModular(
          {
            intent,
            targetLanguage: language,
          },
          validatedErrors
        );

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: input.input });

  const model = String(process.env.CLARA_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
  const temperature = getEnvFloat("CLARA_TEMPERATURE", 0.5);
  const maxTokens = getEnvInt("CLARA_MAX_TOKENS", 1000);
  const timeoutMs = getEnvInt("CLARA_TIMEOUT_MS", 25000);

  const completion = await timeout(
    client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
    }),
    timeoutMs
  );

  const raw = completion.choices[0]?.message?.content || "";

  const v = validateClaraRaw(raw);
  if (!v.ok) throw new Error("Respuesta OpenAI inválida");

  const parsed = parseClaraResponse(v.cleaned);

  return { raw, cleaned: v.cleaned, response: parsed.response, engine, language };
}