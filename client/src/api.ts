/**
 * API base URL fallback:
 * 1) VITE_API_BASE_URL (preferido: dominio final / proxy)
 * 2) VITE_API_URL (legacy)
 * 3) window.location.origin (same-origin: Railway hoy, dominio propio mañana)
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  window.location.origin;

export type CorrectionResponse = {
  corrected: string;
  explanations?: string[];
  tips?: string[];
  remainingMessages?: number;
};

export async function fetchCorrection(text: string, language: string, userId: string) {
  const r = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({ text, language }),
  });

  if (!r.ok) throw new Error("Error corrección");
  return (await r.json()) as CorrectionResponse;
}

export async function fetchUsage(userId: string) {
  const r = await fetch(`${API_BASE_URL}/user`, {
    headers: { "x-user-id": userId },
  });

  if (!r.ok) throw new Error("Error uso");
  return await r.json();
}
