import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

export function log(message: string, source = "lexipop-decision") {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${time} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    root:    path.resolve(ROOT, "frontend"),
    server:  { middlewareMode: true },
    appType: "spa",
    logLevel:"info",
  });

  app.use(vite.middlewares);

  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/auth")) return next();
    try {
      const template = fs.readFileSync(path.resolve(ROOT, "frontend/index.html"), "utf-8");
      const html     = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  log("Vite dev middleware activo.");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(ROOT, "frontend/dist");

  if (!fs.existsSync(distPath)) {
    console.warn(`[serveStatic] WARN: ${distPath} no existe. Corre build:frontend primero.`);
    return;
  }

  app.use(require("express").static(distPath, { maxAge: "1y", etag: false, index: false }));

  app.use("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/auth")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });

  log("Sirviendo frontend estático desde dist.");
}