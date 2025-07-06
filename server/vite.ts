// server/vite.ts
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupVite(app: express.Express) {
  // Middleware de Vite (si aplica, puedes dejarlo vacío si no usas Vite en modo dev)
  console.log("✅ setupVite ejecutado");
}

export function serveStatic(app: express.Express) {
  const publicPath = path.resolve(__dirname, "../client/dist");
  app.use(express.static(publicPath));

  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export function log(message: string) {
  console.log("📝", message);
}
