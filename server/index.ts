import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://polyglot-point.vercel.app",
      "https://polyglot-point-production.up.railway.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ========== HANDLER ÚNICO PARA CHAT ==========
async function chatHandler(req: Request, res: Response) {
  try {
    console.log("📨 Chat request received");

    const { message, text, userId } = req.body;
    const input = message ?? text ?? null;

    if (!input) {
      return res.status(400).json({
        error: "Missing message text",
        received: req.body,
      });
    }

    console.log(`✅ Message received: ${input.substring(0, 50)}...`);

    // Respuesta de prueba que entiende el frontend
    res.json({
      corrected: input,
      explanations: [
        "✅ Conexión establecida con el backend",
        "📨 Formato de respuesta 100% compatible con el frontend",
      ],
      tips: [
        "🔧 Listo para conectar OpenAI/GPT/Claude",
        "🎯 Cambia esta respuesta por la corrección gramatical real",
      ],
      language: "es",
      timestamp: new Date().toISOString(),
      status: "operational",
    });
  } catch (error) {
    console.error("❌ Error in /chat:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ========== RUTAS CHAT (AMBAS) ==========
// Lo que sea que use el frontend, cae aquí:
app.post("/chat", chatHandler);
app.post("/api/chat", chatHandler);

// ========== LOG MIDDLEWARE ==========
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  // @ts-expect-error sobrecarga de tipos de Express
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    // @ts-expect-error mantener tipos originales
    return originalResJson.apply(this, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/chat") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 8080;

  server.listen(PORT, "0.0.0.0", () => {
    log(`📝 serving on port ${PORT}`);
  });
})();
