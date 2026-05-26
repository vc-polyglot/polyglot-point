import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { contentRouter } from "./routes/content.js";

dotenv.config();

const app = express();
const PORT = process.env.ASISTENTE_PORT || 3099;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "asistente-vc", version: "1.0.0" });
});

app.use("/api/content", contentRouter);

app.listen(PORT, () => {
  console.log(`asistente-vc corriendo en puerto ${PORT}`);
});
