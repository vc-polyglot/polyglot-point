import { useState } from "react";
import { goGoogleLogin } from "../services/api";

const T = {
  primary:  "#0035c5",
  surface:  "#f8f9fa",
  onSurface:"#191c1d",
  onMuted:  "#434657",
  outline:  "#747688",
  fontHead: "'Hanken Grotesk', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
};

interface Props {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const result = await goGoogleLogin();
    if (result.ok && result.user) {
      onLogin(result.user);
    } else if (result.error !== "cancelled") {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100dvh", background: T.surface,
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "center",
      padding: "2rem 1.5rem", fontFamily: T.fontBody,
    }}>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column" as const, alignItems: "center" }}>

        {/* Logo */}
        <img src="/logo.png" alt="Ohtlica" style={{ height: "3rem", width: "auto", marginBottom: "3rem" }} />

        {/* Imagen */}
        <div style={{ width: "100%", borderRadius: "1.25rem", overflow: "hidden", marginBottom: "2.5rem" }}>
          <img src="/img-camino.png" alt="" style={{ width: "100%", aspectRatio: "3 / 1", objectFit: "cover", display: "block" }} />
        </div>

        {/* Texto */}
        <h1 style={{
          fontFamily: T.fontHead, fontSize: "clamp(1.5rem, 6vw, 2rem)",
          fontWeight: 700, color: T.onSurface, textAlign: "center" as const,
          marginBottom: "0.75rem", lineHeight: 1.2,
        }}>
          Navega tus decisiones
        </h1>
        <p style={{
          fontSize: "1rem", color: T.onMuted, textAlign: "center" as const,
          lineHeight: 1.65, marginBottom: "2.5rem",
        }}>
          No te decimos qué hacer.<br />Te mostramos cómo estás pensando.
        </p>

        {/* Botón Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", padding: "0.9375rem 1.5rem",
            background: loading ? "#e7e8e9" : T.primary,
            color: loading ? T.outline : "#ffffff",
            border: "none", borderRadius: "9999px",
            fontSize: "1rem", fontWeight: 700, fontFamily: T.fontHead,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            transition: "all 180ms",
            boxShadow: loading ? "none" : "0 4px 20px rgba(0,53,197,0.25)",
          }}
        >
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".8"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" opacity=".6"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
            </svg>
          )}
          {loading ? "Iniciando sesión..." : "Continuar con Google"}
        </button>

        {error && (
          <p style={{ color: "#ba1a1a", fontSize: "0.875rem", marginTop: "1rem", textAlign: "center" as const }}>
            {error}
          </p>
        )}

        {/* Disclaimer */}
        <p style={{
          fontSize: "0.75rem", color: T.outline, textAlign: "center" as const,
          marginTop: "2rem", lineHeight: 1.6, maxWidth: 300,
        }}>
          Al continuar aceptas los Términos de Uso. Ohtlica no sustituye la opinión de profesionales de salud mental, finanzas ni ningún campo especializado.
        </p>

      </div>
    </div>
  );
}