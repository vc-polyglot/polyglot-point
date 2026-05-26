import OpenAI from "openai";
import { MASTER_PROMPT } from "./masterPrompt";

export interface ContentOutput {
  idea_central: string;
  hook: string;
  tiktok: string;
  instagram_caption: string;
  facebook_post: string;
  youtube_short_idea: string;
  titulo: string;
  resumen: string;
  hashtags: string[];
  angulos_adicionales: string[];
}

export async function runContentAgent(input: string): Promise<ContentOutput> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    messages: [
      { role: "system", content: MASTER_PROMPT },
      { role: "user", content: input }
    ]
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("El agente no devolvio respuesta");

  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as ContentOutput;
}
