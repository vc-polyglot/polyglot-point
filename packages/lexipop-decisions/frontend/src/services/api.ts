import type { DecisionInput, DecisionResult } from "../types";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

function isNativePlatform(): boolean {
  return !!(window as any)?.Capacitor?.isNativePlatform?.();
}

function getBase(): string {
  const origin = isNativePlatform()
    ? "https://lexipop-decisions-production.up.railway.app"
    : "";
  return `${origin}/api`;
}

export async function goGoogleLogin(): Promise<{
  ok: boolean;
  user?: any;
  error?: string;
}> {
  try {
    console.log("[GOOGLE] iniciando login");

    await GoogleSignIn.initialize({
      clientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    });

    const result = await GoogleSignIn.signIn();

    const idToken =
      result?.authentication?.idToken ||
      (result as any)?.idToken ||
      result?.user?.idToken;

    if (!idToken) throw new Error("No idToken");

    const response = await fetch(`${getBase()}/auth/google/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        return { ok: true, user: data.user };
      } else {
        return { ok: false, error: "Formato de respuesta inválido" };
      }
    } else {
      const txt = await response.text();
      alert("Backend: " + response.status + " " + txt);  // ← temporal
      return { ok: false, error: txt };
    }
  } catch (error: any) {
    console.error("[GOOGLE] error:", error.message);
    alert("Error: " + error.message);   // ← temporal
    return { ok: false, error: error.message };
  }
}

export async function evaluateDecision(
  payload: DecisionInput
): Promise<DecisionResult> {
  const res = await fetch(`${getBase()}/decision/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getMe(): Promise<{
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
} | null> {
  try {
    const res = await fetch(`${getBase()}/me`, { credentials: "include" });
    if (res.status === 401) return null;
    return await res.json();
  } catch (err) {
    console.log("[AUTH] getMe error:", err);
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${getBase()}/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (isNativePlatform()) {
    try {
      await GoogleSignIn.signOut();
    } catch (err) {
      console.log("[AUTH] signOut error:", err);
    }
  }
}