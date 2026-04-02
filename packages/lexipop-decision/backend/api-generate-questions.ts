import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateQuestions(req: Request, res: Response) {
  try {
    const { title, level } = req.body;

    if (!title || !level) {
      return res.status(400).json({ error: "Faltan title o level" });
    }

    const prompt = `
Eres un asistente que ayuda a tomar mejores decisiones.

Contexto:
- Decisión: "${title}"
- Tipo: ${level === "cotidiana" ? "cotidiana (bajo riesgo)" : level === "carrera" ? "profesional" : "financiera"}

Genera 4 preguntas clave para analizar esta decisión, basadas en:
1. Impacto: ¿Qué cambia con cada opción?
2. Riesgo: ¿Qué probabilidad asignas? ¿Cuál es el peor escenario?
3. Reversibilidad: ¿Qué tan fácil es deshacerla?
4. Costo de oportunidad: ¿Qué sacrificas?

Responde SOLO con un objeto JSON válido con esta estructura:
{
  "optionAQuestion": "pregunta para describir qué pasa si elige A",
  "optionBQuestion": "pregunta para describir qué pasa si elige B",
  "probabilityQuestion": "pregunta sobre probabilidad de éxito",
  "worstScenarioQuestion": "pregunta sobre el peor escenario",
  "reversibilityQuestion": "pregunta sobre qué tan reversible es",
  "opportunityQuestion": "pregunta sobre qué sacrifica"
}

No incluyas texto adicional fuera del JSON.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content;
    const questions = JSON.parse(content || "{}");

    res.json(questions);
  } catch (error) {
    console.error("Error generando preguntas:", error);
    // Fallback preguntas genéricas
    res.json({
      optionAQuestion: "¿Qué cambia si decides hacerlo?",
      optionBQuestion: "¿Qué cambia si decides no hacerlo?",
      probabilityQuestion: "¿Qué probabilidad le asignas (0-100%) a que funcione?",
      worstScenarioQuestion: "¿Cuál es el peor escenario posible?",
      reversibilityQuestion: "¿Qué tan fácil es deshacer esta decisión (0-10)?",
      opportunityQuestion: "¿Qué estás sacrificando al elegir esto?",
    });
  }
}