// server/vite.ts
import path from "path";
import express, { Request, Response } from "express";

// Usamos la carpeta raíz del proyecto en vez de import.meta.url
const ROOT_DIR = process.cwd();

// Solo activa en desarrollo si usas Vite en modo dev
export function setupVite(app: express.Express) {
  console.log("✅ setupVite ejecutado");
}

// Sirve los archivos estáticos desde dist/public (que es lo que sube Railway)
export function serveStatic(app: express.Express) {
  const publicPath = path.resolve(ROOT_DIR, "dist/public");
  console.log("📦 Sirviendo estáticos desde:", publicPath);

  app.use(express.static(publicPath));

  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export function log(message: string) {
  console.log("📝", message);
}
