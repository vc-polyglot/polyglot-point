import type { MeResponse } from "./types";
import { GoogleAuth } from "@daniele-rolli/capacitor-google-auth";

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || res.statusText);
    (err as any).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export async function apiMe(): Promise<MeResponse> {
  return jsonFetch<MeResponse>("/api/me", { method: "GET" });
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
}

export async function goGoogleLogin(): Promise<void> {
  try {
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication?.idToken;
    if (!idToken) throw new Error("No se recibió idToken de Google");

    const response = await fetch("https://www.polyglotpoint.com/api/auth/google/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    if (response.ok) {
      window.location.href = "/";
    } else {
      const error = await response.json();
      console.error("Error del backend:", error);
    }
  } catch (error: any) {
    if (!error.message?.includes("cancel")) {
      console.error("Error en login:", error);
    }
  }
}