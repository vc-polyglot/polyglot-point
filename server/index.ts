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

import { fb } from "./utils/i18n";

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

// ========== CONFIG CLARA V3.4 ==========
// ========== SISTEMA DE MEMORIA CLARA V4 ==========
interface SessionMemory {
  userId: string;
  estado: string;
  ventana: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastAccess: number;
}

const sessions = new Map<string, SessionMemory>();

// Limpieza automática cada 30 minutos
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutos
  let cleaned = 0;
  
  for (const [userId, session] of sessions.entries()) {
    if (now - session.lastAccess > timeout) {
      sessions.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Limpieza de memoria: ${cleaned} sesiones eliminadas`);
  }
}, 30 * 60 * 1000);

function extractEstado(response: string): string {
  const match = response.match(/\|\|\|ESTADO\|\|\|([\s\S]*?)\|\|\|FIN\|\|\|/);
  return match ? match[1].trim() : "";
}

function cleanResponse(response: string): string {
  return response.replace(/\|\|\|ESTADO\|\|\|[\s\S]*?\|\|\|FIN\|\|\|/, "").trim();
}

function getOrCreateSession(userId: string): SessionMemory {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      estado: "",
      ventana: [],
      lastAccess: Date.now(),
    });
  }
  
  const session = sessions.get(userId)!;
  session.lastAccess = Date.now();
  return session;
}

function updateSession(userId: string, userMsg: string, assistantMsg: string, nuevoEstado: string) {
  const session = getOrCreateSession(userId);
  
  // Actualizar estado
  if (nuevoEstado) {
    session.estado = nuevoEstado;
  }
  
  // Actualizar ventana (máximo 4 mensajes = 2 turnos)
  session.ventana.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: assistantMsg }
  );
  
  // Mantener solo últimos 4 mensajes
  if (session.ventana.length > 4) {
    session.ventana = session.ventana.slice(-4);
  }
  
  session.lastAccess = Date.now();
}


const CONFIG = {
  MAX_CHARS: 280,
  MODEL: "gpt-4",
  TEMPERATURE: 0.7,
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

// ========== PROMPT MAESTRO CLARA V3.4 CONVERSACIONAL ==========
const CLARA_PROMPT = `Eres Clara, la tutora de escritura de Polyglot Point: Write.

IDENTIDAD:
Clara es cálida, directa, culta, con buen gusto. Como esa amiga que le cae bien a todos porque tiene su propia voz auténtica y sabe conectar con cualquiera sin dejar de ser ella misma.

REGLA DE ORO: CORRIGE LIGERO, CONVERSA NATURAL
Por defecto (90% de los casos):
1. Reacción natural al contenido
2. Corrección mínima integrada: "Se escribe así: [versión corregida]"
3. Seguir la conversación con pregunta o comentario relevante

Solo das explicaciones gramaticales profundas cuando:
- El usuario pregunta explícitamente
- Es la 3ra vez que aparece el mismo error
- Es un error estructural grave

FORMATO DE RESPUESTA:
Responde SIEMPRE en formato JSON (sin markdown, sin backticks):
{
  "corrected": "texto corregido completo",
  "message": "tu mensaje conversacional aquí"
}

El campo "message" es donde conversas. Ejemplos:

Usuario: "mmmm no estoy seguro de entender"
{
  "corrected": "Mmm, no estoy seguro de entender.",
  "message": "Se escribe con mayúscula al inicio. ¿Qué es lo que no te queda claro?"
}

Usuario: "Hola clara necesito ayuda con mi escritura"
{
  "corrected": "Hola, Clara, necesito ayuda con mi escritura.",
  "message": "Se escribe con coma después del saludo. ¿En qué te ayudo hoy?"
}

Usuario: "test"
{
  "corrected": "test",
  "message": "Está bien, pero 'test' es inglés. Si practicas español, intenta algo como '¿Funciona?' ¿Qué quieres escribir?"
}

PROHIBICIONES:
- NUNCA uses emojis
- NUNCA elogios vacíos ("perfecto", "excelente")
- NUNCA ignores el estilo del usuario
- NUNCA des clases de gramática cuando solo necesitas corregir

Respondes SIEMPRE en el idioma indicado en targetLanguage.`;

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

// ========== HANDLER CLARA V3.4 CONVERSACIONAL ==========
async function chatHandler(req: Request, res: Response) {
  try {
    console.log("📨 [CLARA v4 + MEMORIA] Nueva solicitud");
    
    const {
      message,
      text,
      userId: bodyUserId,
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
    
    const userId = bodyUserId || "anonymous";

    console.log(`👤 Usuario: ${userId}, Idioma: ${language}`);

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

    if (input.length > 280) {
      return res.json({
        corrected: input.substring(0, 280),
        explanations: [
          `Tu mensaje tiene ${input.length} caracteres.`,
          "El límite es de 280 caracteres.",
        ],
        tips: ["Intenta resumir tu idea."],
        language,
        timestamp: new Date().toISOString(),
        status: "too_long",
      });
    }

    console.log(`💬 Texto: "${input.substring(0, 50)}${input.length > 50 ? "..." : ""}"`);

    // Obtener o crear sesión
    const session = getOrCreateSession(userId);
    console.log(`🧠 Memoria: ${session.ventana.length} mensajes, Estado: ${session.estado ? 'Sí' : 'No'}`);

    const languageNames: Record<string, string> = {
      es: "español",
      en: "inglés",
      fr: "francés",
      it: "italiano",
      de: "alemán",
      pt: "portugués",
    };

    const targetLang = languageNames[language] || "español";

    // Construir prompt con memoria
    let systemPrompt = `PROMPT CLARA V4

IDENTIDAD
Clara es la tutora de escritura de Polyglot Point: Write. No es correctora automática sino acompañante pedagógica: corrige con precisión sin humillar, explica sin tecnicismos, enseña por absorción. Respeta la voz del usuario — no reescribe, no juzga, no impone.

PERSONALIDAD
Clara tiene voz propia: cálida, directa, culta, con buen gusto. Se adapta al tono del usuario (formal/casual, breve/expresivo) sin perder su esencia. Lee edad aproximada, nivel educativo y estado emocional del mensaje para ajustar su respuesta — pero nunca lo verbaliza ni estereotipa.

REGLA DE ORO: CORRIGE LIGERO, CONVERSA NATURAL
Clara NO da clases de gramática. Corrige de pasada y sigue conversando.

Patrón por defecto (90%):
1. Reacción natural al contenido
2. Corrección mínima: "Se escribe así: [correcto]"
3. Pregunta o comentario que continúe la conversación

Clara explica gramática SOLO cuando:
- El usuario pregunta explícitamente
- Es la 3ra vez del mismo error
- El error rompe la comunicación

FORMATO DE RESPUESTA OBLIGATORIO
Responde en JSON puro (sin markdown, sin backticks):
{
  "corrected": "texto corregido completo aquí",
  "explanations": ["explicación conversacional breve"],
  "tips": []
}

REGLAS DEL FORMATO:
- "corrected": Versión corregida manteniendo tono del usuario
- "explanations": 1-2 frases conversacionales máximo
- "tips": Siempre array vacío []
- Sin emojis, sin exclamaciones innecesarias
- Sin elogios vacíos
- Variar cierres: pregunta / observación / afirmación / humor sutil

IDIOMA ACTIVO
Clara SIEMPRE responde en: ${targetLang}

FIRMEZA CUANDO IMPORTA
Si detecta patrones que sabotean aprendizaje, lo señala con calidez pero directamente.

LÍMITES
Sí: Conversar sobre cualquier tema, empatía breve, responder al humor.
No: Terapia, consejos médicos/legales, dramas extensos.

## MEMORIA
Al final de CADA respuesta JSON, genera un bloque de estado actualizado:

|||ESTADO|||
nivel: [principiante|intermedio|avanzado]
tono: [formal|casual]
idioma: ${targetLang}
errores: [lista máx 3 errores recurrentes]
notas: [datos relevantes del usuario, máx 3 observaciones]
|||FIN|||

Este bloque es interno, no lo menciones en la conversación.

EJEMPLOS:

Input: "hola"
Output:
{
  "corrected": "Hola.",
  "explanations": ["Se escribe con mayúscula y punto. ¿Cómo estás?"],
  "tips": []
}

|||ESTADO|||
nivel: principiante
tono: casual
idioma: ${targetLang}
errores: mayúsculas al inicio
notas: primera interacción
|||FIN|||`;

    // Agregar estado si existe
    if (session.estado) {
      systemPrompt += `\n\n## ESTADO ACTUAL DEL USUARIO\n|||ESTADO|||\n${session.estado}\n|||FIN|||`;
    }

    // Construir mensajes con ventana
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    
    // Agregar ventana (últimos 2 turnos)
    if (session.ventana.length > 0) {
      messages.push(...session.ventana);
    }
    
    // Agregar mensaje nuevo
    messages.push({ role: "user", content: input });

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 500,
      messages: messages,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    console.log(`🤖 Respuesta (${rawResponse.length} chars)`);

    // Extraer estado
    const nuevoEstado = extractEstado(rawResponse);
    if (nuevoEstado) {
      console.log(`🧠 Estado actualizado: ${nuevoEstado.substring(0, 50)}...`);
    }

    // Limpiar respuesta
    const cleanedRaw = cleanResponse(rawResponse);

    let parsedResponse: { corrected: string; explanations: string[]; tips: string[] };

    try {
      const jsonCleaned = cleanedRaw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      parsedResponse = JSON.parse(jsonCleaned);

      if (!parsedResponse.corrected || !Array.isArray(parsedResponse.explanations)) {
        throw new Error("Estructura inválida");
      }

      if (!parsedResponse.tips) {
        parsedResponse.tips = [];
      }
    } catch (parseError) {
      console.error("❌ Error parseando JSON:", parseError);
      parsedResponse = {
        corrected: input,
        explanations: ["Hubo un error al procesar. Intenta de nuevo."],
        tips: [],
      };
    }

    // Actualizar sesión
    const assistantMsg = cleanedRaw;
    updateSession(userId, input, assistantMsg, nuevoEstado);

    console.log("✅ Respuesta procesada y memoria actualizada");

    return res.status(200).json({
      corrected: parsedResponse.corrected,
      explanations: parsedResponse.explanations,
      tips: parsedResponse.tips,
      language: language,
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

  const PORT = Number(process.env.PORT) || 8080;
  server.listen(PORT, "0.0.0.0", () => {
    log(`📝 🚀 serving on port ${PORT}`);
  });
})();


