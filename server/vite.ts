// server/vite.ts
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Solo activa en desarrollo si usas Vite en modo dev
export function setupVite(app: express.Express) {
  console.log("✅ setupVite ejecutado");
}

// Este es el fix clave: sirve desde dist/public, que sí sube a Railway
export function serveStatic(app: express.Express) {
  const publicPath = path.resolve(__dirname, "./public");
  app.use(express.static(publicPath));

  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export function log(message: string) {
  console.log("📝", message);
}
