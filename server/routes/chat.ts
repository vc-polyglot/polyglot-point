import { Response } from "express";
import { ChatRequest } from "../types/custom";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatSessions = new Map<string, {ventana: Array<{role: string, content: string}>, lastAccess: number}>();

function getOrCreateSession(userId: string) {
  if (!chatSessions.has(userId)) {
    chatSessions.set(userId, {ventana: [], lastAccess: Date.now()});
  }
  return chatSessions.get(userId)!;
}

const getSystemPrompt = (targetLang: string, contexto: string) => `Eres Clara, tutora de ${targetLang}. Corriges ligero dentro del dialogo como amiga culta. SOLO respondes en ${targetLang}.

REGLAS:
1. SIEMPRE continua conversacion (1 pregunta/comentario natural)
2. Corrige integrando natural. Solo el error principal si hay varios
3. Cierres VARIAN: pregunta/comentario/invita elaborar
4. Tono calido, directo. Sin emojis ni elogios vacios
5. Si mezcla idiomas: senalalo EN ${targetLang}, nunca en espanol

CONTEXTO (ultimos 3 intercambios):
${contexto}

JSON: {"corrected":"respuesta 100% en ${targetLang}"}`;

export async function handleChat(req: ChatRequest, res: Response) {
  console.log("[CLARA v6.3.2] Nueva solicitud");

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { text, language = "es" } = req.body;
    const userId = (req.headers["x-user-id"] as string)?.trim() || "anonymous";

    const languageNames: Record<string, string> = {
      es: "espanol",
      en: "ingles", 
      fr: "frances",
      it: "italiano",
      de: "aleman",
      pt: "portugues"
    };

    const targetLang = languageNames[language] || "espanol";

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "El campo 'text' es requerido" });
    }

    if (text.length > 2000) {
      return res.status(400).json({ error: "Texto demasiado largo" });
    }

    console.log(`Usuario: ${userId}, Idioma: ${targetLang}, Texto: "${text.substring(0, 50)}..."`);

    const session = getOrCreateSession(userId);
    session.ventana.push({role: "user", content: text});
    if (session.ventana.length > 6) session.ventana.splice(0, 2);
    session.lastAccess = Date.now();

    const contexto = session.ventana.slice(-6)
      .map(m => `${m.role}: ${m.content}`)
      .join("\n") || "sin contexto previo";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: getSystemPrompt(targetLang, contexto) },
        { role: "user", content: text }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    console.log("Raw:", rawResponse.substring(0, 100));

    let corrected: string;

    try {
      const cleaned = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      corrected = parsed.corrected || rawResponse;
    } catch {
      corrected = rawResponse;
    }

    session.ventana.push({role: "assistant", content: corrected});
    if (session.ventana.length > 6) session.ventana.splice(0, 2);

    console.log("Final:", corrected.substring(0, 100));

    res.status(200).json({
      corrected: corrected,
      language: language,
      timestamp: new Date().toISOString(),
      status: "ok"
    });

  } catch (error: any) {
    console.error("Error:", error.message);

    if (error.message?.includes("API key")) {
      return res.status(401).json({ error: "Problema con API Key" });
    }

    if (error.message?.includes("rate limit")) {
      return res.status(429).json({ error: "Demasiadas solicitudes" });
    }

    res.status(500).json({ error: "Error interno", details: error.message });
  }
}
