import { CLARA_IDENTITY } from "./core/identity";
import { CLARA_PEDAGOGICAL_LAYER } from "./core/pedagogical";
import { CLARA_LANGUAGE_HANDLER } from "./core/language-handler";
import { getQuestionModePrompt } from "./modes/question";
import { getCorrectionModePrompt } from "./modes/correction";
import { getConversationModePrompt } from "./modes/conversation";
import type { Intent } from "../services/intent-classifier";

interface BuildPromptParams {
  intent: Intent;
  targetLanguage: string;
  userLevel?: string;
  userMessage?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

const MAX_TURNS = 10;

const langMap: Record<string, string> = {
  en: "en",
  english: "en",
  "inglés": "en",
  es: "es",
  spanish: "es",
  "español": "es",
  fr: "fr",
  french: "fr",
  "francés": "fr",
  it: "it",
  italian: "it",
  "italiano": "it",
  de: "de",
  german: "de",
  "alemán": "de",
  pt: "pt",
  portuguese: "pt",
  "portugués": "pt",
};

export function buildClaraPrompt(params: BuildPromptParams): string {
  const {
    intent,
    targetLanguage,
    userLevel = "intermediate",
    userMessage = "",
    conversationHistory = [],
  } = params;

  let modeBlock: string;
  if (intent === "PREGUNTA") modeBlock = getQuestionModePrompt();
  else if (intent === "CORRECCION") modeBlock = getCorrectionModePrompt();
  else modeBlock = getConversationModePrompt();

  const langKey = targetLanguage.trim().toLowerCase();
  const normalizedLang = langMap[langKey] || "en";

  const recentHistory =
    conversationHistory.length > 0
      ? conversationHistory.slice(-MAX_TURNS)
      : [];

  const historyText =
    recentHistory.length > 0
      ? "\n" +
        recentHistory
          .map(
            (m) =>
              `${m.role === "user" ? "Usuario" : "Clara"}: ${m.content}`
          )
          .join("\n")
      : "No hay historial previo.";

  return `
${CLARA_IDENTITY}
${CLARA_PEDAGOGICAL_LAYER}
${CLARA_LANGUAGE_HANDLER}

${modeBlock}

IdiomaActivo: ${normalizedLang}
Nivel del usuario: ${userLevel}
Responde ÚNICAMENTE con lo que Clara diría. No añadas explicaciones externas, prefijos ni formato adicional.
`;
}

