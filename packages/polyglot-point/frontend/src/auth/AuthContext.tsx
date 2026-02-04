import React from "react"

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
    fetch("/api/me", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}