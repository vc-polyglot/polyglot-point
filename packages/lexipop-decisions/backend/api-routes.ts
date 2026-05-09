import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { runDecisionEngine } from "./core/decisionEngine";
import type { DecisionInput, AIAnalysis } from "./core/types";
import { generateQuestions } from "./api-generate-questions";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);

// ── Auth Google Token ────────────────────────────────────────────────────────
router.post("/auth/google/token", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken requerido" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID_WEB,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "Token inválido" });
    if (!payload.email_verified) return res.status(401).json({ error: "Email no verificado" });

    const email     = payload.email!;
    const name      = payload.name || email.split("@")[0];
    const googleId  = payload.sub;
    const avatarUrl = payload.picture || null;

    const [existing] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

    let user = existing;
    if (!user) {
      const [created] = await db.insert(users).values({ email, name, googleId, avatarUrl }).returning();
      user = created;
    }

    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => err ? reject(err) : resolve());
    });

    return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });

  } catch (err) {
    console.error("[Auth/Google/Token]", err);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
});

// ── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "lexipop-decision" });
});

// ── Generate personalized questions ─────────────────────────────────────────
router.post("/decision/generate-questions", generateQuestions);

// ── Analyze decision ─────────────────────────────────────────────────────────
router.post("/decision/analyze", async (req, res) => {
  const input = req.body as DecisionInput;

  if (!input?.title || !input?.level || input?.probability === undefined) {
    return res.status(400).json({ error: "Faltan campos requeridos: title, level, probability." });
  }

  const metrics = runDecisionEngine(input);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada." });
  }

  const systemPrompt = `Eres un sistema de análisis estructural de decisiones.
Tu función NO es aconsejar al usuario qué hacer.
Tu función ES revelar la estructura de su razonamiento: supuestos implícitos, sesgos cognitivos, puntos ciegos y patrones de pensamiento.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones fuera del JSON.
El JSON debe tener exactamente esta estructura:
{
  "blindSpots": ["array de 2-3 puntos ciegos específicos detectados"],
  "riskAssessment": "1 párrafo corto sobre la estructura de riesgo real",
  "biasFlags": ["array de 1-3 sesgos cognitivos detectados con nombre específico"],
  "structuralCommentary": "1-2 párrafos de análisis pedagógico — qué revela su forma de razonar",
  "lessonsLearned": ["array de 2-3 aprendizajes concretos sobre su proceso de decisión"]
}`;

  const userMessage = `
DECISIÓN: ${input.title}
TIPO: ${input.level}
ALTERNATIVA A: ${input.altA}
ALTERNATIVA B: ${input.altB}
PROBABILIDAD DE ÉXITO ESTIMADA: ${input.probability}%
VALOR SI FUNCIONA: ${input.valueSuccess}
VALOR SI FALLA: ${input.valueFailure}
PEOR ESCENARIO: ${input.worstScenario}
SEVERIDAD DEL PEOR ESCENARIO (1-10): ${input.worstSeverity}
REVERSIBILIDAD (0-10): ${input.reversibilityScore}
COSTO DE REVERTIR: ${input.revertCost}
IMPACTO 6 MESES: ${input.impact6m}
IMPACTO 3 AÑOS: ${input.impact3y}
COSTO DE OPORTUNIDAD: ${input.opportunityCost}
QUÉ DEJA DE HACER: ${input.opportunityDesc}

MÉTRICAS CALCULADAS:
- Valor esperado: ${metrics.expectedValue.toFixed(0)}
- Valor esperado neto: ${metrics.expectedValueNet.toFixed(0)}
- Índice de riesgo: ${metrics.riskIndex}/100
- Índice de irreversibilidad: ${metrics.irreversibilityIndex}/100
- Threshold de sensibilidad: ${metrics.sensitivityThreshold}%
- Escenario base: ${metrics.baseScenario}
- Advertencias automáticas: ${metrics.warnings.join(" | ")}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      "gpt-4o-mini",
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
      }),
    });

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?:   { message: string };
    };

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.choices?.[0]?.message?.content || "{}";
    let analysis: AIAnalysis;

    try {
      analysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      analysis = {
        blindSpots:           ["No se pudo analizar en este momento."],
        riskAssessment:       raw,
        biasFlags:            [],
        structuralCommentary: "",
        lessonsLearned:       [],
      };
    }

    return res.json({ metrics, analysis });

  } catch (err) {
    console.error("[OpenAI] Error:", err);
    return res.status(500).json({ error: "Error al contactar el servicio de análisis." });
  }
});

export default router;