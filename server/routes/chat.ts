import express, { Request, Response } from "express";
import OpenAI from "openai";
import { detectIntent } from "../services/intent-classifier";
import { buildClaraPrompt } from "../prompts/builder";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface ChatBody {
  userId?: string;
  message?: string;
  text?: string;
  targetLanguage?: string;
  language?: string;
  userLevel?: string;
}

router.post(
  "/chat",
  async (req: Request<{}, {}, ChatBody>, res: Response) => {
    try {
      const { userId, message, text, targetLanguage, language, userLevel } =
        req.body || {};

      const finalMessage = (message ?? text ?? "").trim();
      if (!finalMessage) {
        return res.status(400).json({ error: "Mensaje vacío" });
      }

      const finalTargetLanguage = targetLanguage || language || "es";

      // 1. Detectamos intent en el backend
      const intent = detectIntent(finalMessage);

      // 2. Historial simple en memoria (temporal)
      const g = globalThis as any;
      if (!g.claraHistory) g.claraHistory = {};
      const key = userId || "anon";
      const history: { role: "user" | "assistant"; content: string }[] =
        g.claraHistory[key] || [];

      // 3. Construimos el prompt NUEVO y POTENTE
      const systemPrompt = buildClaraPrompt({
        intent,
        targetLanguage: finalTargetLanguage,
        userLevel: userLevel || "intermediate",
        userMessage: finalMessage,
        conversationHistory: history.slice(-10),
      });

      // 4. Llamada a OpenAI – system fuerte + user explícito
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature:
          intent === "CORRECCION" || intent === "PREGUNTA" ? 0.4 : 0.7,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}

REGLAS ABSOLUTAS (nunca las rompas):
- NUNCA digas solo "Tu texto ya está perfecto" o "Está correcto".
- SIEMPRE aporta valor: matiz, ejemplo, pregunta o corrección útil.
- Usa EXACTAMENTE el formato indicado en el modo activo.
- Responde ÚNICAMENTE con el mensaje de Clara. Nada más.

Modo forzado por el sistema: ${intent}
`.trim(),
          },
          {
            role: "user",
            content: finalMessage,
          },
        ],
      });

      const respuesta = (completion.choices[0]?.message?.content || "").trim();

      // 5. Guardamos historial en memoria
      history.push({ role: "user", content: finalMessage });
      history.push({ role: "assistant", content: respuesta });
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
      g.claraHistory[key] = history;

      // 6. Respuesta en formato compatible con el frontend de Write
      return res.json({
        original: finalMessage,
        corrected: respuesta,
        explanations: [],
        tips: [],
        intent,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error interno" });
    }
  }
);

export default router;
