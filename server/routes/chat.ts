import express, { Request, Response } from "express";

const router = express.Router();

interface ChatBody {
  message?: string;
  text?: string;
  targetLanguage?: string;
  language?: string;
}

router.post(
  "/chat",
  (req: Request<{}, {}, ChatBody>, res: Response) => {
    const body = req.body || {};
    const msg = (body.message ?? body.text ?? "").trim();
    const lang = body.targetLanguage || body.language || "es";
    const now = new Date().toISOString();

    return res.json({
      original: msg || "(vacío)",
      corrected: `CLARA V3 TEST – ${now} – idiomaActivo=${lang}`,
      explanations: [],
      tips: [],
      debug: true
    });
  }
);

export default router;
