import type { DecisionInput, DecisionResult } from "../types";
import { getGoogleAuth } from "../lib/googleAuth";

const isNative: boolean = !!(window as any)?.Capacitor?.isNativePlatform?.();
const ORIGIN = isNative ? "https://lexipop-decisions-production.up.railway.app" : "";
const BASE = `${ORIGIN}/api`;

export async function goGoogleLogin(): Promise<{ ok: boolean; user?: any; error?: string }> {
  try {
    const GoogleAuth = await getGoogleAuth();
    if (!GoogleAuth) return { ok: false, error: "Login solo disponible en la app" };

    const result = await GoogleAuth.signIn();
    const idToken = result.authentication?.idToken;
    if (!idToken) throw new Error("No idToken");

    const response = await fetch(`${BASE}/auth/google/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: true, user: data.user };
    }
    return { ok: false, error: "Error al autenticar" };
  } catch (error: any) {
    if (error.message?.includes("cancel")) return { ok: false, error: "cancelled" };
    return { ok: false, error: error.message };
  }
}

export async function evaluateDecision(payload: DecisionInput): Promise<DecisionResult> {
  const res = await fetch(`${BASE}/decision/analyze`, {
    method:      "POST",
    headers:     { "Content-Type": "application/json" },
    credentials: "include",
    body:        JSON.stringify(payload),
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

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" });
  if (isNative) {
    const GoogleAuth = await getGoogleAuth();
    if (GoogleAuth) {
      try { await GoogleAuth.signOut(); } catch {}
    }
  }
}