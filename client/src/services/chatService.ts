import { CONSTANTS } from "../constants";
let cachedUserId: string | null = null;

export const getUserId = (): string => {
  if (cachedUserId) return cachedUserId;
  const stored = localStorage.getItem("pp_userId");
  if (stored) { cachedUserId = stored; return stored; }
  const newId = "user_" + crypto.randomUUID();
  localStorage.setItem("pp_userId", newId);
  cachedUserId = newId;
  return newId;
};

export const sendMessage = async (text: string, userId: string): Promise<string> => {
  const res = await fetch(`${CONSTANTS.API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ message: text, userId }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.reply ?? data.message ?? "No entendí, ¿puedes repetirlo?";
};
