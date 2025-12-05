import { CONSTANTS } from "../constants";

let cachedUserId: string | null = null;

export const getUserId = (): string => {
  if (cachedUserId) return cachedUserId;

  const stored = localStorage.getItem("pp_userId");
  if (stored) {
    cachedUserId = stored;
    return stored;
  }

  const newId = "user_" + crypto.randomUUID();
  localStorage.setItem("pp_userId", newId);
  cachedUserId = newId;
  return newId;
};

export interface SendMessageOptions {
  userId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
  onError?: (status: number, body: string) => void;
}

export const sendMessage = async (
  text: string,
  options: SendMessageOptions = {}
): Promise<string> => {
  const finalUserId = options.userId ?? getUserId();

  // Configurar timeout si se especifica
  let controller: AbortController | undefined;
  if (options.timeoutMs) {
    controller = new AbortController();
    setTimeout(() => controller?.abort(), options.timeoutMs);
  }

  const res = await fetch(`${CONSTANTS.API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": finalUserId,
      ...(options.extraHeaders ?? {}),
    },
    body: JSON.stringify({ message: text }),
    signal: options.signal ?? controller?.signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    options.onError?.(res.status, errorBody);
    throw new Error(`Error ${res.status}`);
  }

  const data = await res.json().catch(() => ({} as any));
  console.log("Respuesta del backend:", data);

  const reply =
    data.corrected ??
    data.reply ??
    data.message ??
    "No entendí, ¿puedes repetirlo?";

  return reply;
};
