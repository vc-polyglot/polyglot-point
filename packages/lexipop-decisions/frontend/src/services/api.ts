import type { DecisionInput, DecisionResult } from "../types";
import { getGoogleAuth } from "../lib/googleAuth";

function isNativePlatform(): boolean {
  return !window.location.href.startsWith("http");
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

    const GoogleAuth = await getGoogleAuth();

    console.log("[GOOGLE] plugin encontrado:", !!GoogleAuth);

    if (!GoogleAuth) {
      console.log("[GOOGLE] plugin inexistente");
      return {
        ok: false,
        error: "Login solo disponible en la app",
      };
    }

    console.log("[GOOGLE] llamando signIn");

    const result = await GoogleAuth.signIn();

    console.log("[GOOGLE] resultado completo:", result);

    const idToken = result.authentication?.idToken;

    console.log("[GOOGLE] idToken existe:", !!idToken);

    if (!idToken) {
      throw new Error("No idToken");
    }

    console.log("[GOOGLE] enviando token al backend");

    const response = await fetch(`${getBase()}/auth/google/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    console.log("[GOOGLE] status backend:", response.status);

    if (response.ok) {

      const data = await response.json();

      console.log("[GOOGLE] login correcto");

      return {
        ok: true,
        user: data.user,
      };
    }

    const txt = await response.text();

    console.log("[GOOGLE] backend error:", txt);

    return {
      ok: false,
      error: txt || "Error al autenticar",
    };

  } catch (error: any) {

    console.log("[GOOGLE] EXCEPTION:", error);
    console.log("[GOOGLE] MESSAGE:", error?.message);
    console.log("[GOOGLE] STACK:", error?.stack);

    if (error?.message?.includes("cancel")) {
      return {
        ok: false,
        error: "cancelled",
      };
    }

    return {
      ok: false,
      error: error?.message || "unknown error",
    };
  }
}

export async function evaluateDecision(
  payload: DecisionInput
): Promise<DecisionResult> {

  const res = await fetch(`${getBase()}/decision/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {

    const err = await res
      .json()
      .catch(() => ({ error: "Error desconocido" }));

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

    const res = await fetch(`${getBase()}/me`, {
      credentials: "include",
    });

    console.log("[AUTH] /me status:", res.status);

    if (res.status === 401) {
      return null;
    }

    const data = await res.json();

    console.log("[AUTH] usuario:", data);

    return data;

  } catch (err) {

    console.log("[AUTH] getMe error:", err);

    return null;
  }
}

export async function logout(): Promise<void> {

  console.log("[AUTH] logout");

  await fetch(`${getBase()}/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (isNativePlatform()) {

    const GoogleAuth = await getGoogleAuth();

    if (GoogleAuth) {
      try {

        console.log("[AUTH] signOut google");

        await GoogleAuth.signOut();

      } catch (err) {

        console.log("[AUTH] signOut error:", err);
      }
    }
  }
}