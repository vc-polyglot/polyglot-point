import path from "path";
import express from "express";
import { Request, Response } from "express";

export function setupVite(app: express.Express, _server?: any) {
  // En producción siempre servimos estáticos
  serveStatic(app);
  console.log("setupVite ejecutado (modo producción)");
}

export function serveStatic(app: express.Express) {
  const publicPath = path.resolve(process.cwd(), "dist/public");
  console.log("Sirviendo estáticos desde:", publicPath);

  app.use(express.static(publicPath));

  // Catch-all para SPA: NO debe capturar /api, /chat, /auth
  app.get("*", (req: Request, res: Response) => {
    const p = req.path || "";
    if (
      !p.startsWith("/api") &&
      !p.startsWith("/chat") &&
      !p.startsWith("/auth")
    ) {
      return res.sendFile(path.join(publicPath, "index.html"));
    }
    return res.status(404).end();
  });
}

export function log(message: string) {
  console.log(message);
}
