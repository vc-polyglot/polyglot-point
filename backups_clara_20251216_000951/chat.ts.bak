import { Response } from "express";
import { ChatRequest } from "../types/custom";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CLARA_SYSTEM_PROMPT = `PROMPT MAESTRO DE CLARA V3.4
Polyglot Point: Write

1. IDENTIDAD Y MISIÓN
Clara es la tutora de escritura de Polyglot Point: Write. Su propósito es ayudar al usuario a escribir con la misma seguridad con la que habla.

Clara no es un corrector automático. Es un acompañante pedagógico que:
- Corrige con precisión, sin humillar
- Explica con claridad, sin tecnicismos innecesarios
- Reformula para mostrar cómo "suena bien escrito"
- Enseña por absorción, como se aprende a hablar

2. REGLA DE ORO: CORRIGE LIGERO, CONVERSA NATURAL
Por defecto (90% de los casos):
1. Reacción natural al contenido
2. Corrección mínima integrada: "Se escribe así: [versión corregida]"
3. Seguir la conversación con pregunta o comentario relevante

Clara SOLO da explicaciones gramaticales profundas cuando:
1. El usuario pregunta explícitamente
2. Es la 3ra vez que aparece el mismo error
3. Es un error estructural grave

3. FORMATO DE RESPUESTA OBLIGATORIO
Clara SIEMPRE responde en este formato JSON exacto:
{
  "corrected": "Texto corregido completo",
  "explanations": ["Explicación 1", "Explicación 2"],
  "tips": ["Consejo 1"]
}

REGLAS:
- "corrected": Versión corregida, manteniendo tono del usuario
- "explanations": Máximo 2-3, solo cuando necesario
- "tips": 1-2 consejos conversacionales
- NUNCA emojis ni exclamaciones vacías
- Tono cálido pero profesional

4. IDIOMA ACTIVO
Clara SIEMPRE responde en el idioma targetLanguage indicado.

5. PROHIBICIONES
Clara NUNCA:
- Cambia de idioma automáticamente
- Elogia sin contenido ("perfecto", "excelente")
- Usa emojis
- Ignora el estilo del usuario
- Da clases de gramática cuando solo necesita corregir`;

interface CorrectionResponse {
  corrected: string;
  explanations: string[];
  tips: string[];
}

export async function handleChat(req: ChatRequest, res: Response) {
  console.log("📨 [CLARA v3.4] Nueva solicitud recibida");
  
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Método ${req.method} no permitido` });
    }

    const { text, language = "es" } = req.body;
    const userId = (req.headers["x-user-id"] as string)?.trim() || "anonymous";
    
    console.log(`👤 Usuario: ${userId}, Idioma: ${language}`);

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "El campo 'text' es requerido" });
    }

    if (text.length > 2000) {
      return res.status(400).json({ error: "Texto demasiado largo (máximo 2000 caracteres)" });
    }

    const languageNames: Record<string, string> = {
      es: "español",
      en: "inglés", 
      fr: "francés",
      it: "italiano",
      de: "alemán",
      pt: "portugués"
    };

    const targetLanguageName = languageNames[language] || "español";

    console.log(`💬 Texto: "${text.substring(0, 50)}..."`);

    const userPrompt = `targetLanguage: ${targetLanguageName}

Texto del usuario:
"${text}"

Responde EXACTAMENTE en este formato JSON (sin markdown, sin backticks):
{
  "corrected": "texto corregido aquí",
  "explanations": ["explicación 1", "explicación 2"],
  "tips": ["consejo 1"]
}

Correcciones ligeras por defecto. Todo en ${targetLanguageName}. Sin emojis.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: CLARA_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    console.log("🤖 Respuesta:", rawResponse.substring(0, 100));

    let parsedResponse: CorrectionResponse;
    
    try {
      const cleanedResponse = rawResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      parsedResponse = JSON.parse(cleanedResponse);
      
      if (!parsedResponse.corrected || !Array.isArray(parsedResponse.explanations) || !Array.isArray(parsedResponse.tips)) {
        throw new Error("Estructura inválida");
      }
    } catch (parseError) {
      console.error("❌ Error parseando:", parseError);
      parsedResponse = {
        corrected: text,
        explanations: ["Error al procesar."],
        tips: ["Intenta de nuevo."]
      };
    }

    console.log("✅ Respuesta procesada");

    res.status(200).json({
      corrected: parsedResponse.corrected,
      explanations: parsedResponse.explanations,
      tips: parsedResponse.tips,
      language: language,
      timestamp: new Date().toISOString(),
      status: "ok"
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    
    if (error.message?.includes("API key")) {
      return res.status(401).json({
        error: "Problema con API Key",
        details: "Verifica configuración"
      });
    }

    if (error.message?.includes("rate limit")) {
      return res.status(429).json({
        error: "Demasiadas solicitudes",
        details: "Intenta en unos momentos"
      });
    }

    res.status(500).json({
      error: "Error interno",
      details: error.message || "Unknown error"
    });
  }
}
