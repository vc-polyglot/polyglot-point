export type Intent = "CONVERSACION" | "CORRECCION" | "PREGUNTA";

type InferIntentParams = {
  // Texto que mandó el usuario (ya recortado o sin recortar, da igual)
  input: string;
  // Idioma activo (es/en/fr/it/de/pt). Sirve para detectar signos como ¿? etc.
  language?: string;
};

function looksLikeQuestion(text: string): boolean {
  const t = text.trim();

  // Signos de interrogación
  if (t.includes("?") || t.includes("¿")) return true;

  // Preguntas típicas por palabra inicial (multilenguaje básico)
  const start = t.toLowerCase();
  const startsWith = [
    "qué", "que ", "cómo", "como ", "cuál", "cual ", "cuándo", "cuando ",
    "dónde", "donde ", "por qué", "porque ", "why ", "what ", "how ",
    "when ", "where ", "which ", "qui ", "quoi ", "comment ", "quand ",
    "où ", "dove ", "perché", "perche", "che ", "come ", "quando ",
    "wo ", "was ", "wie ", "wann ", "woher ", "dove ", "porque ",
  ];

  return startsWith.some((p) => start.startsWith(p));
}

function looksLikeCorrectionRequest(text: string): boolean {
  const t = text.toLowerCase();

  // Peticiones explícitas de corrección Y explicación
  const triggers = [
    // Corrección (español)
    "corrige", "corrígeme", "corregir", "corrección",
    "revisa", "revísame", "revisar",
    "mejorar", "mejóralo", "mejora",
    "gramática", "ortografía", "ortografia",
    
    // Explicación (español)
    "explica", "explícame", "explicar", "explicación", "explique",
    "ayúdame", "ayuda", "ayudar",
    
    // Inglés
    "rewrite", "correct", "fix my", "proofread",
    "explain", "explain to me", "explanation",
    "help me", "help with",
    
    // Francés
    "corriger", "corrige-moi", "corriger mon",
    "explique", "explique-moi", "expliquer", "explication",
    "aide", "aide-moi",
    
    // Italiano
    "correggi", "correggimi",
    "spiega", "spiegami", "spiegare", "spiegazione",
    "aiuta", "aiutami",
    
    // Alemán
    "korrigiere", "rechtschreibung", "grammatik",
    "erkläre", "erklär mir", "erklären", "erklärung",
    "hilf", "hilf mir",
    
    // Portugués
    "corrige", "corrige-me",
    "explica", "explica-me", "explicar", "explicação",
    "ajuda", "ajuda-me",
  ];

  if (triggers.some((k) => t.includes(k))) return true;

  // Si el texto es largo tipo párrafo sin signos de pregunta, suele ser corrección.
  // (heurística suave, no absoluta)
  const len = text.trim().length;
  if (len >= 120 && !looksLikeQuestion(text)) return true;

  return false;
}

export function inferIntent(params: InferIntentParams): Intent {
  const input = (params.input || "").trim();
  if (!input) return "CONVERSACION";

  if (looksLikeCorrectionRequest(input)) return "CORRECCION";
  if (looksLikeQuestion(input)) return "PREGUNTA";

  return "CONVERSACION";
}