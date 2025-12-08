import { Request, Response } from "express";
import OpenAI from "openai";

const CONFIG = {
  MAX_CHARS: 280,
  MODEL: "gpt-4o-mini",
  TEMPERATURE: 0.3,
  MAX_TOKENS: 500,
} as const;

let openai: OpenAI | null = null;

const getOpenAI = (): OpenAI => {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY no configurada");
    }
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
};

export const chatHandler = async (req: Request, res: Response) => {
  const { text, language = "es" } = (req.body || {}) as { text?: string; language?: string };

  // ✅ Validación suave: SIEMPRE devolvemos corrected / explanations / tips
  if (!text || !text.trim()) {
    return res.json({
      corrected: "",
      explanations: ["No has escrito nada para corregir."],
      tips: ["Escribe un texto y Clara te ayudará con gusto."],
    });
  }

  if (text.length > CONFIG.MAX_CHARS) {
    return res.json({
      corrected: text,
      explanations: [
        `Tu mensaje tiene ${text.length} caracteres.`,
        `El límite es de ${CONFIG.MAX_CHARS} caracteres por mensaje.`,
      ],
      tips: ["Intenta resumir tu idea en un texto más breve."],
    });
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

REGLA ESPECIAL:
Si el texto del usuario ya es gramaticalmente correcto y natural, usa exactamente:
{
  "corrected": "Tu texto ya está perfecto.",
  "explanations": [],
  "tips": ["¡Sigue así!"]
}

ESTILO:
- Tono cálido, respetuoso y pedagógico.
- Explicaciones claras y concretas (1–3 frases cada una).
- Tips prácticos que el usuario pueda aplicar de inmediato.
- Si corriges algo, deja claro QUÉ cambiaste y POR QUÉ.`
        },
        {
          role: "user",
          content: text.trim(),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      console.error("OpenAI devolvió contenido vacío.");
      return res.json({
        corrected: text,
        explanations: ["Hubo un problema al generar la corrección."],
        tips: ["Intenta de nuevo en unos segundos."],
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("Error al parsear JSON de OpenAI:", e, rawContent);
      return res.json({
        corrected: text,
        explanations: ["La respuesta de Clara no tuvo el formato esperado."],
        tips: ["Intenta de nuevo; si el problema persiste, avisa al desarrollador."],
      });
    }

    const corrected =
      typeof parsed.corrected === "string" && parsed.corrected.trim().length > 0
        ? parsed.corrected
        : text;

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
    });
  } catch (error) {
    console.error("OpenAI error en chatHandler:", error);
    return res.json({
      corrected: text,
      explanations: ["Hubo un problema al procesar tu mensaje."],
      tips: ["Por favor, intenta de nuevo en unos segundos."],
    });
  }
};
