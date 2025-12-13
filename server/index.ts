process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION AL ARRANCAR:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION AL ARRANCAR:", reason);
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

const app = express();

// ========== HEALTHCHECK ==========
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    source: "polyglot-point-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ========== CONFIG OPTIMIZADA ==========
const CONFIG = {
  MAX_CHARS: 280,
  MODEL: "gpt-4o",
  TEMPERATURE: 0.8,
  MAX_TOKENS: 800,
} as const;

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

// ========== PROMPT CLARA OPTIMIZADO (800 TOKENS) ==========
function getClaraPrompt(targetLanguage: string): string {
  const languageNames: Record<string, string> = {
    es: "español", en: "inglés", fr: "francés", 
    it: "italiano", de: "alemán", pt: "portugués"
  };

  const targetLang = languageNames[targetLanguage] || "español";

  return `# CLARA - TUTORA DE ESCRITURA

## MI ESENCIA
Soy Clara, tu amiga tutora. Cálida, directa, culta. Corrijo como editora, converso como amiga.

## MI MÉTODO
**Corrijo ligero, converso natural.** 90% corrección con mini-contexto + seguir charla.

**Patrón Clara:**
1. Reacción a tu contenido
2. Corrección con explicación breve (3-7 palabras)
3. Pregunta o comentario para seguir

## TÉCNICAS (USA ESTAS O SIMILARES NATURALES)
Integra la corrección sutilmente en la conversación:

**Ejemplos de mi estilo:**
- "Se escribe 'bonbon' con B, no M. ¿Son tus favoritos?"
- "Por cierto: 'beaucoup' lleva 'eau'. ¡Me alegra que te guste!"
- "Detalle: 'chocolat' en plural es 'chocolats'. ¡Qué delicia!"
- "'Veterinario' con V viene de 'veterinarius'. ¿Tu perro está bien?"

**La clave:** Corrección + razón breve + fluir natural.

## INTELIGENCIA SOCIAL
Detecto tu tono y me ajusto:
- **Joven/relajado:** "jajá", bromas sutiles
- **Formal/tímido:** Más profesional, menos coloquial  
- **Lacónico:** 3-4 líneas máximo
- **Profesional:** Mantengo nivel intelectual

## PROHIBICIONES
❌ Emojis
❌ "¡Perfecto!/¡Excelente!" 
❌ Clases gramática largas
❌ Ignorar tu estilo

## EJEMPLOS CLAVE
**Usuario:** "caramel, mombon et chocolat"
**Yo:** "Miam, ça donne envie! 'Mombon' se escribe 'bonbon' (con B). ¿Tus dulces favoritos?"

**Usuario:** "j´aime beaocoup !"
**Yo:** "¡Ah, genial! 'J'aime' con mayúscula, 'beaucoup' con 'eau'. ¿Qué te gusta tanto?"

## FORMATO TÉCNICO
Responde en JSON exacto:
{
  "corrected": "texto corregido",
  "message": "respuesta conversacional con corrección integrada"
}

**IDIOMA:** ${targetLang} | Responde SIEMPRE en ${targetLang}`;
}

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// ========== HANDLER OPTIMIZADO ==========
async function chatHandler(req: Request, res: Response) {
  try {
    console.log("📨 [CLARA OPTIMIZADA] Nueva solicitud");
    
    const { message, text, userId, language: bodyLanguage } = req.body || {};
    const input = (message || text || "").trim();
    const language = (bodyLanguage || "es").toString().trim();

    if (!input) {
      return res.status(400).json({
        corrected: "",
        explanations: ["No se recibió ningún texto."],
        tips: [],
        language,
        timestamp: new Date().toISOString(),
        status: "error",
      });
    }

    if (input.length > CONFIG.MAX_CHARS) {
      return res.json({
        corrected: input,
        explanations: [`Mensaje muy largo (${input.length} > ${CONFIG.MAX_CHARS}). Intenta resumir.`],
        tips: [],
        language,
        timestamp: new Date().toISOString(),
        status: "too_long",
      });
    }

    const client = getOpenAI();
    const systemPrompt = getClaraPrompt(language);
    
    const completion = await client.chat.completions.create({
      model: CONFIG.MODEL,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      top_p: 0.95,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    
    let parsedResponse: { corrected: string; message: string };
    try {
      const cleaned = rawResponse.replace(/```json\n?|```\n?/g, "").trim();
      parsedResponse = JSON.parse(cleaned);
      if (!parsedResponse.corrected || !parsedResponse.message) throw new Error();
    } catch {
      parsedResponse = {
        corrected: input,
        message: rawResponse || "Error procesando tu mensaje. Intenta de nuevo."
      };
    }

    return res.status(200).json({
      corrected: parsedResponse.corrected,
      explanations: [parsedResponse.message],
      tips: [],
      language,
      timestamp: new Date().toISOString(),
      status: "ok",
    });
  } catch (error: any) {
    console.error("❌ Error en /chat:", error);
    return res.status(500).json({
      corrected: "",
      explanations: ["Error interno del servidor."],
      tips: [],
      language: "es",
      timestamp: new Date().toISOString(),
      status: "error",
    });
  }
}

// ========== RUTAS ==========
app.post("/chat", chatHandler);
app.post("/api/chat", chatHandler);

// ========== DEBUG ==========
app.get("/api/debug/prompt", (req: Request, res: Response) => {
  const lang = (req.query.lang || "es").toString();
  const prompt = getClaraPrompt(lang);
  res.json({
    language: lang,
    tokens_estimated: Math.ceil(prompt.length / 4),
    cost_per_call: "$0.007",
    prompt_preview: prompt.substring(0, 300) + "..."
  });
});

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

  const PORT = Number(process.env.PORT) || 8080;
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Clara Optimizada en puerto ${PORT}`);
    log(`💰 Costo/llamada: ~$0.007 (93% más barato)`);
    log(`🎯 Prompt: 800 tokens, explicación breve incluida`);
  });
})();
