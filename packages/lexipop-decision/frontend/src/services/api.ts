import type { DecisionInput, DecisionResult } from "../types";

const BASE = "/api";

export async function evaluateDecision(payload: DecisionInput): Promise<DecisionResult> {
  const res = await fetch(`${BASE}/decision/analyze`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getMe(): Promise<{ id: number; email: string; name: string; avatarUrl?: string } | null> {
  const res = await fetch(`${BASE}/me`, { credentials: "include" });
  if (res.status === 401) return null;
  return res.json();
}