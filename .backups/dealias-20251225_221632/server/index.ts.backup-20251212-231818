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

// ========== CONFIG OPENAI / CLARA ==========
const CONFIG = {
  MAX_CHARS: 280,
  MODEL: "gpt-4o-mini",
  TEMPERATURE: 0.3,
  MAX_TOKENS: 500,
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

// ========== MIDDLEWARES BÁSICOS ==========
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://polyglot-point.vercel.app",
      "https://polyglot-point-production.up.railway.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ========== LOG MIDDLEWARE ==========
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  // @ts-expect-error sobrecarga de tipos de Express
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    // @ts-expect-error mantener tipos originales
    return originalResJson.apply(this, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/chat") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ========== HANDLER ÚNICO PARA CHAT (CLARA REAL) ==========
async function chatHandler(req: Request, res: Response) {
  try {
    console.log("?? Chat request received");

    const {
      message,
      text,
      userId,
      language: bodyLanguage,
    } = (req.body || {}) as {
      message?: string;
      text?: string;
      userId?: string;
      language?: string;
    };

    const inputRaw =
      typeof message === "string" && message.trim().length > 0
        ? message
        : typeof text === "string"
          ? text
          : "";

    const input = inputRaw.trim();
    const language =
      typeof bodyLanguage === "string" && bodyLanguage.trim().length > 0
        ? bodyLanguage
        : "es";

    if (!input) {
      return res.status(400).json({
        corrected: "",
        explanations: ["No se recibió ningún texto para corregir."],
        tips: ["Escribe un texto y Clara te ayudará con gusto."],
        language,
        timestamp: new Date().toISOString(),
        status: "error",
      });
    }

    if (input.length > CONFIG.MAX_CHARS) {
      return res.json({
        corrected: input,
        explanations: [
          `Tu mensaje tiene ${input.length} caracteres.`,
          `El límite es de ${CONFIG.MAX_CHARS} caracteres por mensaje.`,
        ],
        tips: ["Intenta resumir tu idea en un texto más breve."],
        language,
        timestamp: new Date().toISOString(),
        status: "too_long",
      });
    }

    console.log(
      `? Message received (${language}): ${input.substring(0, 80)}${
        input.length > 80 ? "..." : ""
      }`,
    );

    const client = getOpenAI();

    const completion = await client.chat.completions.create({
      model: CONFIG.MODEL,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres Clara, la tutora amable de Polyglot Point: Write.

INSTRUCCIONES CRÍTICAS:
- Responde SIEMPRE en el idioma indicado: ${language}.
- Devuelve EXCLUSIVAMENTE un objeto JSON válido.
- NO escribas nada fuera del JSON.

Estructura EXACTA del JSON:
{
  "corrected": "texto corregido completo aquí",
  "explanations": ["explicación breve 1", "explicación breve 2"],
  "tips": ["sugerencia útil 1", "sugerencia útil 2"]
}

REGLAS ESPECIALES:
- Si el texto del usuario ya es gramaticalmente correcto y natural:
  - Pon el mismo texto del usuario en "corrected".
  - En "explanations", escribe 1–2 frases breves aclarando que no fue necesario hacer cambios importantes.
  - "tips" puede estar vacío o contener una sugerencia concreta para seguir mejorando.
- NO uses frases genéricas como "Tu texto ya está perfecto".
- NO devuelvas mensajes vacíos del tipo "¡Sigue así!" sin explicar nada.

ESTILO:
- Tono cálido, respetuoso y pedagógico.
- Explicaciones claras y concretas (1–3 frases cada una).
- Tips prácticos que el usuario pueda aplicar de inmediato.
- Si corriges algo, deja claro QUÉ cambiaste y POR QUÉ.`,
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (typeof rawContent !== "string") {
      console.error("OpenAI devolvió contenido no textual:", rawContent);
      return res.json({
        corrected: input,
        explanations: ["Hubo un problema al interpretar la respuesta de Clara."],
        tips: ["Intenta de nuevo; si el problema persiste, avisa al desarrollador."],
        language,
        timestamp: new Date().toISOString(),
        status: "bad_format",
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("Error al parsear JSON de OpenAI:", e, rawContent);
      return res.json({
        corrected: input,
        explanations: ["La respuesta de Clara no tuvo el formato JSON esperado."],
        tips: ["Intenta de nuevo; si el problema persiste, avisa al desarrollador."],
        language,
        timestamp: new Date().toISOString(),
        status: "parse_error",
      });
    }

    const corrected =
      typeof parsed.corrected === "string" && parsed.corrected.trim().length > 0
        ? parsed.corrected
        : input;

    const explanations = Array.isArray(parsed.explanations)
      ? parsed.explanations.filter((x: unknown) => typeof x === "string")
      : [];

    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.filter((x: unknown) => typeof x === "string")
      : [];

    return res.json({
      corrected,
      explanations,
      tips,
      language,
      timestamp: new Date().toISOString(),
      status: "ok",
    });
  } catch (error) {
    console.error("? Error in /chat:", error);
    return res.status(500).json({
      corrected: "",
      explanations: ["Hubo un problema al procesar tu mensaje."],
      tips: ["Por favor, intenta de nuevo en unos segundos."],
      language: "es",
      timestamp: new Date().toISOString(),
      status: "server_error",
    });
  }
}

// ========== RUTAS CHAT (AMBAS) ==========
// Lo que sea que use el frontend, cae aquí:
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

  const PORT = Number(process.env.PORT) || 8080;

  server.listen(PORT, "0.0.0.0", () => {
    log(`?? serving on port ${PORT}`);
  });
})();

