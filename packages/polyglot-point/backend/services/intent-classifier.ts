export type Intent = "CONVERSACION" | "CORRECCION" | "PREGUNTA";

type InferIntentParams = {
  // Texto que mandÃƒÂ³ el usuario (ya recortado o sin recortar, da igual)
  input: string;
  // Idioma activo (es/en/fr/it/de/pt). Sirve para detectar signos como Ã‚Â¿? etc.
  language?: string;
};

function looksLikeQuestion(text: string): boolean {
  const t = text.trim();

  // Signos de interrogaciÃƒÂ³n
  if (t.includes("?") || t.includes("Ã‚Â¿")) return true;

  // Preguntas tÃƒÂ­picas por palabra inicial (multilenguaje bÃƒÂ¡sico)
  const start = t.toLowerCase();
  const startsWith = [
    "quÃƒÂ©", "que ", "cÃƒÂ³mo", "como ", "cuÃƒÂ¡l", "cual ", "cuÃƒÂ¡ndo", "cuando ",
    "dÃƒÂ³nde", "donde ", "por quÃƒÂ©", "porque ", "why ", "what ", "how ",
    "when ", "where ", "which ", "qui ", "quoi ", "comment ", "quand ",
    "oÃƒÂ¹ ", "dove ", "perchÃƒÂ©", "perche", "che ", "come ", "quando ",
    "wo ", "was ", "wie ", "wann ", "woher ", "dove ", "porque ",
  ];

  return startsWith.some((p) => start.startsWith(p));
}

function looksLikeCorrectionRequest(text: string): boolean {
  const t = text.toLowerCase();

  // Peticiones explÃƒÂ­citas de correcciÃƒÂ³n Y explicaciÃƒÂ³n
  const triggers = [
    // CorrecciÃƒÂ³n (espaÃƒÂ±ol)
    "corrige", "corrÃƒÂ­geme", "corregir", "correcciÃƒÂ³n",
    "revisa", "revÃƒÂ­same", "revisar",
    "mejorar", "mejÃƒÂ³ralo", "mejora",
    "gramÃƒÂ¡tica", "ortografÃƒÂ­a", "ortografia",
    
    // ExplicaciÃƒÂ³n (espaÃƒÂ±ol)
    "explica", "explÃƒÂ­came", "explicar", "explicaciÃƒÂ³n", "explique",
    "ayÃƒÂºdame", "ayuda", "ayudar",
    
    // InglÃƒÂ©s
    "rewrite", "correct", "fix my", "proofread",
    "explain", "explain to me", "explanation",
    "help me", "help with",
    
    // FrancÃƒÂ©s
    "corriger", "corrige-moi", "corriger mon",
    "explique", "explique-moi", "expliquer", "explication",
    "aide", "aide-moi",
    
    // Italiano
    "correggi", "correggimi",
    "spiega", "spiegami", "spiegare", "spiegazione",
    "aiuta", "aiutami",
    
    // AlemÃƒÂ¡n
    "korrigiere", "rechtschreibung", "grammatik",
    "erklÃƒÂ¤re", "erklÃƒÂ¤r mir", "erklÃƒÂ¤ren", "erklÃƒÂ¤rung",
    "hilf", "hilf mir",
    
    // PortuguÃƒÂ©s
    "corrige", "corrige-me",
    "explica", "explica-me", "explicar", "explicaÃƒÂ§ÃƒÂ£o",
    "ajuda", "ajuda-me",
  ];

  if (triggers.some((k) => t.includes(k))) return true;

  // Si el texto es largo tipo pÃƒÂ¡rrafo sin signos de pregunta, suele ser correcciÃƒÂ³n.
  // (heurÃƒÂ­stica suave, no absoluta)
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