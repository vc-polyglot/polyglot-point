import { Request, Response } from "express";
import OpenAI from "openai";

const CONFIG = {
  MAX_CHARS: 280,
  MODEL: "gpt-4o-mini",
  TEMPERATURE: 0.3,
  MAX_TOKENS: 500,
} as const;

let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY no configurada");
    }
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
};

interface ChatResponse {
  corrected: string;
  explanations: string[];
  tips: string[];
}

interface ChatRequest {
  text?: string;
  language?: string;
}

export const chatHandler = async (req: Request, res: Response) => {
  const { text, language = "es" } = req.body as ChatRequest;

  // 1) Texto vacío o solo espacios
  if (!text || !text.trim()) {
    const base: ChatResponse = {
      corrected: "",
      explanations: ["No has escrito nada para corregir."],
      tips: ["Escribe un texto y Clara te ayudará con gusto."],
    };
    return res.json(base);
  }

  const trimmed = text.trim();

  // 2) Texto más largo de 280 (solo pasaría si alguien llama directo a la API)
  if (trimmed.length > CONFIG.MAX_CHARS) {
    const recortado = trimmed.slice(0, CONFIG.MAX_CHARS);
    const tooLong: ChatResponse = {
      corrected: recortado,
      explanations: [
        `Tu mensaje era muy largo, así que tomé solo los primeros ${CONFIG.MAX_CHARS} caracteres para corregirlos.`,
      ],
      tips: [
        "Si necesitas corregir un texto más largo, divídelo en partes más pequeñas.",
      ],
    };
    return res.json(tooLong);
  }

  try {
    const client = getOpenAI();

    const completion = await client.chat.completions.create({
      model: CONFIG.MODEL,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres Clara, tutor amable de Polyglot Point: Write.
Responde SIEMPRE en ${language}.
Devuelve SOLO un objeto JSON con esta estructura exacta:
{
  "corrected": "texto corregido completo",
  "explanations": ["explicación breve 1", "explicación breve 2"],
  "tips": ["sugerencia útil 1", "sugerencia útil 2"]
}

Si el texto ya es correcto:
{
  "corrected": "Tu texto ya está perfecto.",
  "explanations": [],
  "tips": ["¡Sigue así!"]
}

No añadas texto fuera del JSON.`,
        },
        {
          role: "user",
          content: trimmed,
        },
      ],
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      const fallback: ChatResponse = {
        corrected: trimmed,
        explanations: ["Clara no pudo generar una respuesta esta vez."],
        tips: ["Por favor, intenta de nuevo en unos segundos."],
      };
      return res.json(fallback);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Error al parsear JSON de Clara:", e, "content:", content);
      const parseError: ChatResponse = {
        corrected: trimmed,
        explanations: ["Hubo un problema al interpretar la respuesta de Clara."],
        tips: ["Inténtalo de nuevo con una frase un poco más corta o clara."],
      };
      return res.json(parseError);
    }

    const corrected =
      typeof parsed.corrected === "string" ? parsed.corrected : trimmed;
    const explanations = Array.isArray(parsed.explanations)
      ? parsed.explanations
      : [];
    const tips = Array.isArray(parsed.tips) ? parsed.tips : [];

    const ok: ChatResponse = {
      corrected,
      explanations,
      tips,
    };

    return res.json(ok);
  } catch (err) {
    console.error("OpenAI error:", err);

    const errorResponse: ChatResponse = {
      corrected: trimmed,
      explanations: ["Hubo un problema al procesar tu mensaje."],
      tips: ["Por favor, intenta de nuevo en unos segundos."],
    };

    return res.json(errorResponse);
  }
};
