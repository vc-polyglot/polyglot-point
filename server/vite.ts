// server/vite.ts
import path from "path";
import express from "express";
import { Request, Response } from "express";

// En Railway (y en producción en general), el proceso se ejecuta
// desde la raíz del proyecto (/app). Nuestro build pone los archivos
// estáticos en dist/public, así que usamos process.cwd() como base.

export function setupVite(app: express.Express) {
  // En producción (Railway) no usamos Vite en modo dev,
  // así que aquí no hacemos nada de momento.
  console.log("✅ setupVite ejecutado (modo producción)");
}

// Sirve archivos estáticos desde dist/public
export function serveStatic(app: express.Express) {
  const publicPath = path.resolve(process.cwd(), "dist/public");
  console.log("🛣️  Sirviendo estáticos desde:", publicPath);

  app.use(express.static(publicPath));

  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export function log(message: string) {
  console.log("📝", message);
}
