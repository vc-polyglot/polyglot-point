export type CorrectionResponse = {
  corrected: string;
  explanations: string[];
  tips: string[];
  remainingMessages?: number;
  aviso?: string;
};

// Usa Vite (recomendado)
const API_BASE =
  // @ts-ignore
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "https://polyglot-point-production.up.railway.app";

export const fetchCorrection = async (
  text: string,
  language: string,
  userId: string
) => {
  const r = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ text, language }),
  });
  if (!r.ok) throw new Error("Error corrección");
  return (await r.json()) as CorrectionResponse;
};

export const fetchUsage = async (userId: string) => {
  const r = await fetch(`${API_BASE}/user`, {
    headers: { "x-user-id": userId },
  });
  if (!r.ok) throw new Error("Error uso");
  return (await r.json()) as { remainingMessages: number };
};
