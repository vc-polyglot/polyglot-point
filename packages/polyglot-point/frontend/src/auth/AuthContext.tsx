import React from "react"
import { Capacitor } from "@capacitor/core"

export type AuthUser = {
  id: number
  email: string
  name: string
  avatarUrl: string
  planType: string
  messagesBank: number
  activeLanguage: string
}

type AuthState = {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
}

const BASE_URL = Capacitor.isNativePlatform()
  ? "https://www.polyglotpoint.com"
  : ""

const AuthContext = React.createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth outside AuthProvider")
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`${BASE_URL}/api/me`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch(`${BASE_URL}/api/logout`, { method: "POST", credentials: "include" })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}