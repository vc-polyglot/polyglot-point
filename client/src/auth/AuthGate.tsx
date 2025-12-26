import React from "react"
import { goGoogleLogin } from "./api"
import { useAuth } from "./AuthContext"

function UserBar() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="w-full border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-9 w-9 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-muted" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Mensajes: <span className="font-medium text-foreground">{user.messagesBank}</span>
          </div>
          <button
            onClick={() => logout()}
            className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted"
            type="button"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  )
}

function LoginScreen({ error }: { error: string | null }) {
  return (
    <div className="min-h-svh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-lg font-semibold">Polyglot Point</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Inicia sesión para continuar con Clara.
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : null}

        <button
          onClick={() => goGoogleLogin()}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          type="button"
        >
          Continuar con Google
        </button>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (!user) {
    return <LoginScreen error={error} />
  }

  return (
    <div className="min-h-svh bg-background">
      <UserBar />
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  )
}
