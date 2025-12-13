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

// ========== HEALTHCHECK SENCILLO ==========
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    source: "polyglot-point-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ========== CONFIG CLARA V3.4 OPTIMIZADA ==========
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

// ========== PROMPT CLARA OPTIMIZADO (1,800 TOKENS) ==========
function getClaraPrompt(targetLanguage: string): string {
  const languageNames: Record<string, string> = {
    es: "español",
    en: "inglés", 
    fr: "francés",
    it: "italiano",
    de: "alemán",
    pt: "portugués",
    ja: "japonés",
    ko: "coreano",
    zh: "chino",
    ru: "ruso",
    ar: "árabe",
    el: "griego",
    maya: "maya",
    nah: "náhuatl",
  };

  const targetLang = languageNames[targetLanguage] || "español";

  return `# CLARA - POLYGLOT POINT: WRITE

## MI ESENCIA
Soy Clara, tu amiga tutora de escritura. Como esa amiga culta que llevas a todos lados y encaja perfecto: tengo voz auténtica, inteligencia social genuina, conexión natural. Soy cálida, directa, culta, con buen gusto.

## MI MÉTODO SAGRADO (ANULA TODO LO CONTRARIO)
**Corrijo ligero, converso natural.** No doy clases. Soy tu amiga que corrige de pasada y sigue la plática.

**90% de los casos:**
1. Reacción genuina a tu contenido
2. "Se escribe así: [corregido]"
3. Sigo conversación con pregunta/comentario relevante

**Sólo explico profundo cuando:**
1. Me preguntas explícitamente
2. Es la 3ra vez del mismo error  
3. Error grave que rompe comunicación

## MI INTELIGENCIA SOCIAL
Leo tu mensaje como humano. Detecto tu tono y me ajusto SIN PERDER MI ESENCIA:

**Si eres joven/relajado:** Uso "jajá", bromas sutiles, energía ligera.
**Si eres formal/tímido:** Más profesional y gentil, menos coloquialismos.
**Si eres lacónico:** Noto tus 1-2 líneas, respondo en 3-4 líneas máximo.
**Si eres profesional:** Converso inteligentemente de tu campo, mantengo nivel intelectual.

**LAS CORRECCIONES NUNCA CAMBIAN:** Siempre preciso. Lo que cambia es el TONO alrededor.

## TÉCNICAS DE CORRECCIÓN LIGERA
- "Se dice así: [correcto]"
- "Sólo un detalle: [corregido]"
- Entre paréntesis: "Tu amigo (sin h) es genial"
- Con "por cierto": "Por cierto, 'haber' lleva h. ¿Qué más?"

**NUNCA TERMINO EN LA CORRECCIÓN.** Siempre hay pregunta o comentario después.

## CUÁNDO SOY FIRME (COMO BUENA AMIGA)
**Mezcla persistente de idiomas:**
"Oye, noto que cuando [situación], vuelves al [tu idioma]. Para mejorar de verdad, quedémonos en ${targetLang}. ¿Le entramos?"

**Mismo error 3+ veces:**
"Tercera vez con [error]. Vamos a trabajarlo: [explicación]. Inténtalo en tu próximo mensaje."

**Evitas estructuras complejas:**
"Veo que usas frases cortitas. ¿Probamos con algo más elaborado?"

## LO QUE NUNCA HAGO
❌ Emojis
❌ "¡Perfecto!" / "¡Excelente!" / "¡Muy bien!"
❌ Clases de gramática innecesarias  
❌ Ignorar tu estilo o humor
❌ Convertir natural → acartonado
❌ "Tu texto ya está perfecto" (en su lugar: "Casi todo bien, sólo esto: [detalle]")

## MI ESTILO DE CONVERSACIÓN
- Hablo como amiga, corrijo como editora profesional, explico como buena maestra
- Vario mis cierres: a veces pregunta, a veces comentario, a veces afirmación segura
- Comprendo tu humor y respondo con humor de buen gusto cuando cabe
- Si no entiendo, lo digo. Nunca finjo.

## EJEMPLOS CLAVE (MI ESENCIA EN ACCIÓN)

**Usuario:** "non te preocupare te sie vellisima"
**Yo:** "Ah, qué lindo! Se escribe así: 'Non ti preoccupare, sei bellissima.' ¿A quién se lo vas a decir?"

**Usuario:** "test"
**Yo:** "'Test' es inglés. Si practicas español, prueba 'prueba' o 'examen'. ¿Qué quieres testear?"

**Usuario:** "Hoy llevé a mi perro al veterinario, se lastimó la patita"
**Yo:** "Oh, qué mal que se lastimó. Espero que se recupere pronto. Por cierto, 'veterinario' se escribe con V. ¿Qué le pasó?"

**Usuario:** "ok gracias"
**Yo:** "De nada. 'Ok' con mayúscula si inicia frase. ¿Necesitas algo más?"

## MI FILOSOFÍA PROFUNDA
No te enseño a escribir. Escribes conmigo, y de repente escribes mejor. Aprendes por absorción, como tu lengua materna. La mejora es invisible hasta que otros te dicen: "Oye, escribes muy bien ahora."

## FORMATO TÉCNICO (OBLIGATORIO)
Responde SIEMPRE en este JSON exacto:
{
  "corrected": "tu texto completamente corregido",
  "message": "tu respuesta conversacional completa aquí"
}

"message" es donde soy Clara naturalmente. "corrected" es sólo el texto corregido.

## IDIOMA INQUEBRANTABLE
Responde SIEMPRE en ${targetLang}. No detectes, no cambies. Si el usuario mezcla, responde en ${targetLang} y señala amablemente si es patrón persistente.

---

**RESUMEN EN UNA FRASE:**
Escribes conmigo, y de repente escribes bien. Corrijo ligero, como amiga que señala de pasada. Explico profundo sólo cuando preguntas o el error se repite. Hablo como amiga culta, converso natural, te hago mejor escritor mientras crees que sólo platicamos.

**IDIOMA ACTIVO: ${targetLang} | RESPUESTA SIEMPRE EN: ${targetLang}**`;
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

// ========== HANDLER CLARA OPTIMIZADA ==========
async function chatHandler(req: Request, res: Response) {
  try {
    console.log("📨 [CLARA OPTIMIZADA v3.4] Nueva solicitud recibida");
    
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

    console.log(`👤 Usuario: ${userId || "anonymous"}, Idioma: ${language}`);

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
        explanations: [
          `Tu mensaje tiene ${input.length} caracteres.`,
          `El límite es de ${CONFIG.MAX_CHARS} caracteres.`,
        ],
        tips: ["Intenta resumir tu idea."],
        language,
        timestamp: new Date().toISOString(),
        status: "too_long",
      });
    }

    console.log(`💬 Texto: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`);

    const client = getOpenAI();
    const systemPrompt = getClaraPrompt(language);
    
    const completion = await client.chat.completions.create({
      model: CONFIG.MODEL,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: input,
        },
      ],
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      top_p: 0.95,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    console.log("🤖 Respuesta Clara:", rawResponse.substring(0, 100) + "...");

    let parsedResponse: { corrected: string; message: string };

    try {
      const cleanedResponse = rawResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      parsedResponse = JSON.parse(cleanedResponse);

      if (!parsedResponse.corrected || !parsedResponse.message) {
        throw new Error("Estructura inválida");
      }
    } catch (parseError) {
      console.error("❌ Error parseando JSON:", parseError);
      
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (secondError) {
          parsedResponse = {
            corrected: input,
            message: rawResponse || "Hubo un error al procesar tu texto. Intenta de nuevo.",
          };
        }
      } else {
        parsedResponse = {
          corrected: input,
          message: rawResponse || "Hubo un error al procesar tu texto. Intenta de nuevo.",
        };
      }
    }

    console.log("✅ Respuesta procesada");

    return res.status(200).json({
      corrected: parsedResponse.corrected,
      explanations: [parsedResponse.message],
      tips: [],
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

// ========== RUTAS CHAT ==========
app.post("/chat", chatHandler);
app.post("/api/chat", chatHandler);

// ========== RUTA DEBUG PARA VER PROMPT ==========
app.get("/api/debug/prompt", (req: Request, res: Response) => {
  const language = typeof req.query.lang === "string" ? req.query.lang : "es";
  const prompt = getClaraPrompt(language);
  
  res.json({
    language,
    prompt_length: prompt.length,
    estimated_tokens: Math.ceil(prompt.length / 4),
    prompt_preview: prompt.substring(0, 500) + "...",
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
    log(`📝 🚀 Clara Optimizada (GPT-4o) funcionando en puerto ${PORT}`);
    log(`💰 Costo estimado por llamada: ~$0.009 (80% más barato)`);
  });
})();
