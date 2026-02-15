import path from "path";
import express, { Request, Response } from "express";

/**
 * En producción:
 *  - Sirve frontend compilado desde dist/public
 * En desarrollo:
 *  - El frontend lo sirve Vite (5173)
 */
export function setupVite(app: express.Express, _server?: any) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    serveStatic(app);
    console.log("setupVite ejecutado (modo producción)");
    return;
  }

  console.log("setupVite ejecutado (modo desarrollo): frontend en Vite (5173)");
}

/**
 * Sirve archivos estáticos y maneja fallback SPA correctamente
 */
export function serveStatic(app: express.Express) {
  // 🔥 CORREGIDO: usar __dirname para que funcione en monorepo Railway
  const publicPath = path.resolve(__dirname, "../dist/public");

  console.log("Sirviendo estáticos desde:", publicPath);

  // 1) Servir archivos estáticos reales
  app.use(
    express.static(publicPath, {
      fallthrough: true,
    })
  );

  // 2) Catch-all SOLO para rutas SPA
  app.get("*", (req: Request, res: Response) => {
    const p = req.path || "";

    const isBackendRoute =
      p.startsWith("/api") ||
      p.startsWith("/chat") ||
      p.startsWith("/auth") ||
      p.startsWith("/health");

    const looksLikeStatic =
      p.startsWith("/assets/") ||
      /\.(js|mjs|cjs|css|map|png|jpg|jpeg|gif|svg|webp|ico|txt|json|woff|woff2|ttf|eot)$/.test(
        p
      );

    if (isBackendRoute || looksLikeStatic) {
      return res.status(404).end();
    }

    return res.sendFile(path.join(publicPath, "index.html"));
  });
}

/**
 * Helper de log
 */
export function log(message: string) {
  console.log(message);
}
