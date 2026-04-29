import React from "react"
import { goGoogleLogin } from "./api"
import { useAuth } from "./AuthContext"

console.log("AUTHGATE_MARKER__2026_01_19__A");

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
    <div className="login-art-root">
      <main className="login-art-main">
        <section className="login-art-left">
          <div className="login-art-content">
            <h1 className="login-art-title">
              Escribe.<br />
              Clara responde.
            </h1>

            <p className="login-art-sub">
              Practica idiomas escribiendo. Clara corrige, explica y mejora tu texto en tiempo real.
            </p>

            {error ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: 'white',
                fontSize: '14px'
              }}>
                {error}
              </div>
            ) : null}

            <button
              onClick={() => { void goGoogleLogin() }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 24px",
                fontSize: 16,
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                margin: "0 auto"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        </section>

        <section className="login-art-right">
          <div className="login-art-portal">
            <div className="login-art-placeholder">
              Vista previa de Clara
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (!user) {
    return <LoginScreen error={null} />
  }

  return (
    <div className="min-h-svh bg-background">
      <UserBar />
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  )
}
