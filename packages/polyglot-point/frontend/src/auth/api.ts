import type { MeResponse } from "./types"
import { Browser } from "@capacitor/browser"

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(text || res.statusText)
    ;(err as any).status = res.status
    throw err
  }
  return (await res.json()) as T
}

export async function apiMe(): Promise<MeResponse> {
  return jsonFetch<MeResponse>("/api/me", { method: "GET" })
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/logout", { method: "POST", credentials: "include" })
}

export async function goGoogleLogin(): Promise<void> {
  await Browser.open({ url: "https://polyglotpoint.com/auth/google" })
}
