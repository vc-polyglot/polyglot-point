import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateQuestions(req: Request, res: Response) {
  try {
    const { title, level } = req.body;

    if (!title || !level) {
      return res.status(400).json({ error: "Faltan title o level" });
    }

    const levelContext = {
      cotidiana:  "decisión cotidiana de bajo riesgo",
      carrera:    "decisión profesional o vocacional",
      financiera: "decisión financiera o de inversión",
    }[level as string] ?? "decisión";

    const prompt = `Eres un coach de toma de decisiones. El usuario está evaluando esta ${levelContext}:

"${title}"

Tu tarea es generar 6 preguntas que lo ayuden a REFLEXIONAR sobre su situación específica.

REGLAS ESTRICTAS:
- Las preguntas deben ser INTROSPECTIVAS, no descriptivas
- NO repitas el título en las preguntas
- NO preguntes "¿qué beneficios tiene X?" — pregunta "¿qué cambia en tu vida si...?"
- La pregunta de probabilidad debe pedir una estimación personal honesta, no técnica
- La pregunta de reversibilidad debe hacer pensar en consecuencias reales, no abstractas
- Usa "tú" directo, tono conversacional, máximo 15 palabras por pregunta

Responde SOLO con JSON válido, sin markdown:
{
  "optionAQuestion": "pregunta sobre qué cambia en su vida si dice sí / lo hace",
  "optionBQuestion": "pregunta sobre qué cambia en su vida si dice no / no lo hace",
  "probabilityQuestion": "pregunta para que estime honestamente cuántas probabilidades tiene de que salga bien",
  "worstScenarioQuestion": "pregunta sobre el peor resultado real que podría vivir",
  "reversibilityQuestion": "pregunta sobre qué tan fácil sería dar marcha atrás si sale mal",
  "opportunityQuestion": "pregunta sobre qué está dejando ir al tomar esta decisión"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
    });

    const content = completion.choices[0].message.content ?? "{}";
    const clean   = content.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);

    res.json(questions);

  } catch (error) {
    console.error("Error generando preguntas:", error);
    res.json({
      optionAQuestion:       "¿Qué cambia en tu vida si decides hacerlo?",
      optionBQuestion:       "¿Qué cambia en tu vida si decides no hacerlo?",
      probabilityQuestion:   "De cada 10 veces que has tomado una decisión así, ¿cuántas te han salido bien?",
      worstScenarioQuestion: "¿Qué es lo peor que podría pasarte realmente si sale mal?",
      reversibilityQuestion: "Si en 6 meses te arrepientes, ¿qué tan fácil sería dar marcha atrás?",
      opportunityQuestion:   "¿Qué estás dejando ir al elegir esto?",
    });
  }
}
