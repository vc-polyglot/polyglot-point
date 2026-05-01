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
    alert("1. Llamando GoogleAuth.signIn...");
    const result = await GoogleAuth.signIn();
    alert("2. signIn OK, idToken: " + (result.authentication?.idToken ? "SÍ" : "NO"));
    
    const idToken = result.authentication?.idToken;
    if (!idToken) {
      alert("ERROR: No se recibió idToken de Google");
      throw new Error("No se recibió idToken de Google");
    }

    alert("3. Enviando al backend...");
    const response = await fetch("https://www.polyglotpoint.com/api/auth/google/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    alert("4. Respuesta del backend: " + response.status);
    
    if (response.ok) {
      alert("5. Login exitoso, redirigiendo...");
      window.location.href = "/";
    } else {
      const error = await response.json();
      alert("ERROR del backend: " + JSON.stringify(error));
    }
  } catch (error: any) {
    alert("CATCH: " + error.message);
    if (error.message?.includes("cancel")) {
      console.log("Usuario canceló el login");
    } else {
      console.error("Error en login:", error);
    }
  }
}