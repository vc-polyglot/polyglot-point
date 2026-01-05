export type ChatResponse = {
  claraResponse: string;
  remainingMessages?: number;
};

export async function fetchChat(text: string, language: string) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, language }),
  });
  if (!r.ok) throw new Error("Error chat");
  const data = (await r.json()) as ChatResponse;
  if (!data?.claraResponse || typeof data.claraResponse !== "string") {
    throw new Error("Respuesta inválida: falta claraResponse");
  }
  return data;
}

export async function fetchUsage(userId: string) {
  const r = await fetch("/api/me", {
    credentials: "include",
  });
  if (!r.ok) throw new Error("Error uso");
  const data = await r.json();
  return { remainingMessages: data.remainingMessages ?? data.messagesBank };
}
