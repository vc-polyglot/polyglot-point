import type { Request, Response } from "express";

export function healthCheck(_req: Request, res: Response) {
  res.status(200).json({
    ok: true,
    status: "healthy",
    service: "polyglot-point",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}