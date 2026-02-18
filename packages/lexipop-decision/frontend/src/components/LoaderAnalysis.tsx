export default function LoaderAnalysis() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "64px 32px", gap: 24,
    }}>
      {/* Spinner */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: "3px solid #E5E3DC",
        borderTopColor: "#2356F6",
        animation: "spin 0.8s linear infinite",
      }} />

      {/* Texto */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#0C0C0A", marginBottom: 6 }}>
          Analizando estructura de decisión…
        </p>
        <p style={{ fontSize: 13, color: "#9B9890" }}>
          Calculando métricas y detectando patrones de razonamiento
        </p>
      </div>

      {/* Pasos animados */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 280 }}>
        {[
          { label: "Motor matemático", delay: "0s" },
          { label: "Análisis de riesgo", delay: "0.3s" },
          { label: "Detección de sesgos", delay: "0.6s" },
        ].map(({ label, delay }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 10,
            animation: `pulse 1.5s ease-in-out ${delay} infinite`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#2356F6", flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: "#6B6860" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}