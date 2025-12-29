const fs = require('fs');

const content = export type CorrectionResponse = {
  corrected: string;
  explanations?: string[];
  tips?: string[];
  remainingMessages?: number;
};

export async function fetchCorrection(text: string, language: string, userId: string) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, language }),
  });
  if (!r.ok) throw new Error("Error corrección");
  return (await r.json()) as CorrectionResponse;
}

export async function fetchUsage(userId: string) {
  const r = await fetch("/api/usage", { credentials: "include" });
  if (!r.ok) throw new Error("Error uso");
  return await r.json();
}
;

fs.writeFileSync('./client/src/api.ts', content, 'utf8');
console.log('api.ts reescrito limpio');
