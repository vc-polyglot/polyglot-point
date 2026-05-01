import { ChatResponseSchema, type ChatResponse } from "../../shared/contracts/chat";
import { Capacitor } from "@capacitor/core";

const BASE_URL = Capacitor.isNativePlatform()
  ? "https://www.polyglotpoint.com"
  : ""

function getSessionId(): string {
  let sid = localStorage.getItem("clara_sid");
  if (!sid) {
    sid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    localStorage.setItem("clara_sid", sid);
  }
  return sid;
}

export async function fetchChat(message: string, language: string = "es"): Promise<ChatResponse> {
  const r = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      message,
      language,
      sessionId: getSessionId(),
      context: {
        uiVersion: "web-dev",
        platform: "web",
      },
    }),
  });
  if (!r.ok) throw new Error("Error chat");
  const raw = await r.json();
  const parsed = ChatResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Respuesta invalida: contrato roto");
  }
  return parsed.data as ChatResponse;
}

export async function fetchUsage(userId: string) {
  const r = await fetch(`${BASE_URL}/api/me`, { credentials: "include" });
  if (!r.ok) throw new Error("Error uso");
  const data = await r.json();
  return { remainingMessages: data.remainingMessages ?? data.messagesBank };
}