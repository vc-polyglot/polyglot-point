export type LangCode = "es" | "en" | "fr" | "it" | "de" | "pt";

export const FALLBACK: Record<LangCode, Record<string, string>> = {
  es: { NO_TEXT: "No se recibió ningún texto.", PROCESS_ERROR: "Hubo un error al procesar. Intenta de nuevo.", INTERNAL_ERROR: "Error interno del servidor.", TRY_AGAIN: "Intenta de nuevo." },
  en: { NO_TEXT: "No text was received.", PROCESS_ERROR: "There was an error processing this. Please try again.", INTERNAL_ERROR: "Internal server error.", TRY_AGAIN: "Please try again." },
  fr: { NO_TEXT: "Aucun texte n’a été reçu.", PROCESS_ERROR: "Erreur lors du traitement. Réessaie.", INTERNAL_ERROR: "Erreur interne du serveur.", TRY_AGAIN: "Réessaie." },
  it: { NO_TEXT: "Non è stato ricevuto alcun testo.", PROCESS_ERROR: "Errore durante l’elaborazione. Riprova.", INTERNAL_ERROR: "Errore interno del server.", TRY_AGAIN: "Riprova." },
  de: { NO_TEXT: "Es wurde kein Text empfangen.", PROCESS_ERROR: "Fehler beim Verarbeiten. Bitte versuche es erneut.", INTERNAL_ERROR: "Interner Serverfehler.", TRY_AGAIN: "Bitte versuche es erneut." },
  pt: { NO_TEXT: "Nenhum texto foi recebido.", PROCESS_ERROR: "Houve um erro ao processar. Tente novamente.", INTERNAL_ERROR: "Erro interno do servidor.", TRY_AGAIN: "Tente novamente." }
};

/**
 * Cadena de fallback (CONTRATO):
 * - fb() SOLO acepta LangCode ya validado.
 * - Si llega algo inválido, ese bug se arregla ANTES (no aquí).
 */
export function fb(lang: LangCode) {
  return FALLBACK[lang];
}
