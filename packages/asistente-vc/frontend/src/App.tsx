import { useState } from "react";
import "./index.css";

interface ContentOutput {
  idea_central: string;
  hook: string;
  tiktok: string | string[];
  instagram_caption: string;
  facebook_post: string;
  youtube_short_idea: string;
  titulo: string;
  resumen: string;
  hashtags: string[];
  angulos_adicionales: string[];
}

function ContentCard({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>
        <button onClick={copy} className="text-xs text-zinc-500 hover:text-white transition">
          {copied ? "copiado" : "copiar"}
        </button>
      </div>
      <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<ContentOutput | null>(null);
  const [error, setError] = useState("");

  const process = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput(null);
    try {
      const res = await fetch("/api/content/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, type: "text" })
      });
      const data = await res.json();
      if (data.success) setOutput(data.data.output);
      else setError("Error procesando el contenido");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const tiktoks = (t: string | string[]) => Array.isArray(t) ? t : [t];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">asistente-vc</h1>
        <p className="text-zinc-500 text-sm mt-1">Multiplica tu contenido</p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <textarea
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-zinc-100 text-sm resize-none focus:outline-none focus:border-zinc-500 transition"
          rows={5}
          placeholder="Escribe o pega tu idea, reflexion, texto..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          onClick={process}
          disabled={loading || !input.trim()}
          className="self-end bg-white text-zinc-950 font-semibold text-sm px-6 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "procesando..." : "procesar"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {output && (
        <div className="flex flex-col gap-4">
          <ContentCard label="idea central" content={output.idea_central} />
          <ContentCard label="hook" content={output.hook} />
          {tiktoks(output.tiktok).map((t, i) => (
            <ContentCard key={i} label={`tiktok ${i + 1}`} content={t} />
          ))}
          <ContentCard label="instagram" content={output.instagram_caption} />
          <ContentCard label="facebook" content={output.facebook_post} />
          <ContentCard label="youtube short" content={output.youtube_short_idea} />
          <ContentCard label="titulo" content={output.titulo} />
          <ContentCard label="resumen" content={output.resumen} />
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">hashtags</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {output.hashtags.map(h => (
                <span key={h} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">{h}</span>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">angulos adicionales</span>
            <ul className="mt-2 flex flex-col gap-1">
              {output.angulos_adicionales.map(a => (
                <li key={a} className="text-sm text-zinc-300">• {a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
