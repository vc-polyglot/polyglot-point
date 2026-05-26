import { Router, Request, Response } from "express";
import { processInput } from "../pipelines/contentPipeline";

export const contentRouter = Router();

contentRouter.post("/process", async (req: Request, res: Response) => {
  try {
    const { input, type = "text" } = req.body;
    if (!input) { res.status(400).json({ error: "Se requiere input" }); return; }
    const result = await processInput(input, type);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});
