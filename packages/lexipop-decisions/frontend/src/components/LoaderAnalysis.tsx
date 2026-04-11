export default function LoaderAnalysis() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ticker {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.7; }
          97% { opacity: 1; }
          98% { opacity: 0.4; }
          99% { opacity: 1; }
        }
        .loader-screen {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          background: #0a1a0a;
          border: 2px solid #1a3a1a;
          border-radius: 8px;
          padding: 2rem;
          max-width: 360px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(0,255,0,0.08), inset 0 0 60px rgba(0,0,0,0.4);
          animation: flicker 4s infinite;
        }
        .loader-screen::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: rgba(0,255,100,0.15);
          animation: scanline 3s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        .loader-label {
          color: #00cc44;
          font-size: 0.625rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
          opacity: 0.6;
        }
        .loader-title {
          color: #00ff66;
          font-size: 0.9375rem;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
          text-shadow: 0 0 10px rgba(0,255,100,0.5);
        }
        .loader-ticker-wrap {
          height: 7rem;
          overflow: hidden;
          border: 1px solid #1a3a1a;
          border-radius: 4px;
          padding: 0.5rem;
          background: #060e06;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .loader-ticker {
          animation: ticker 6s linear infinite;
          color: #00cc44;
          font-size: 0.75rem;
          line-height: 1.8;
          opacity: 0.85;
        }
        .loader-status {
          color: #00ff66;
          font-size: 0.8125rem;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 8px rgba(0,255,100,0.4);
        }
        .loader-cursor {
          display: inline-block;
          animation: blink 1s step-end infinite;
          color: #00ff66;
        }
        .loader-subtext {
          color: #00883a;
          font-size: 0.6875rem;
          letter-spacing: 0.05em;
          line-height: 1.7;
          opacity: 0.75;
        }
        .loader-bar-wrap {
          height: 4px;
          background: #0d1f0d;
          border-radius: 2px;
          margin-top: 1.25rem;
          overflow: hidden;
        }
        .loader-bar {
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, #00cc44, #00ff66);
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(0,255,100,0.6);
          animation: progress 2.5s ease-in-out infinite alternate;
        }
        @keyframes progress {
          0% { width: 15%; margin-left: 0; }
          100% { width: 45%; margin-left: 55%; }
        }
      `}</style>

      <div className="loader-screen">
        <div className="loader-label">LEXIPOP DECISION v1.0</div>
        <div className="loader-title">ANALIZANDO ESTRUCTURA_</div>

        <div className="loader-ticker-wrap">
          <div className="loader-ticker">
            {[
              "EV = P(x) * V(s) + (1-P) * V(f)",
              "CARGANDO SESGOS COGNITIVOS...",
              "RISKINDEX: CALCULANDO",
              "REVERSIBILIDAD: 0.35",
              "ANCLAJE: DETECTADO",
              "OPTIMISMO: EXCESIVO",
              "UMBRAL SENSIBILIDAD: +-12%",
              "COSTO OPORTUNIDAD: ALTO",
              "PEOR ESCENARIO: PROCESANDO",
              "EV = P(x) * V(s) + (1-P) * V(f)",
              "CARGANDO SESGOS COGNITIVOS...",
              "RISKINDEX: CALCULANDO",
              "REVERSIBILIDAD: 0.35",
              "ANCLAJE: DETECTADO",
              "OPTIMISMO: EXCESIVO",
              "UMBRAL SENSIBILIDAD: +-12%",
              "COSTO OPORTUNIDAD: ALTO",
              "PEOR ESCENARIO: PROCESANDO",
            ].map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))}
          </div>
        </div>

        <div className="loader-status">
          LEYENDO ENTRE LINEAS LO QUE ESCRIBISTE<span className="loader-cursor">_</span>
        </div>
        <div className="loader-subtext">
          buscando lo que no dijiste...<br />
          los numeros no mienten, pero tu cerebro si.
        </div>

        <div className="loader-bar-wrap">
          <div className="loader-bar" />
        </div>
      </div>
    </>
  );
}