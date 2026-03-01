import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const publicDir = path.join(__dirname, "../public");
const watermark = path.join(publicDir, "LeO_73_grados.png");

const protectedImages = [
  "Actualidad.jpeg",
  "Organo_de_la_Servette.jpg",
  "RENDER_tamano_40_.jpg",
  "image.jpg",
  "San_Ignacio__actualiad_.jpeg"
];

app.get("/:img", async (req, res, next) => {
  const filename = req.params.img;
  if (!protectedImages.includes(filename)) return next();

  const imgPath = path.join(publicDir, filename);
  if (!fs.existsSync(imgPath)) return next();

  try {
    const base = sharp(imgPath);
    const meta = await base.metadata();
    const wmSize = Math.round(meta.width * 0.25);

    const wm = await sharp(watermark)
      .resize(wmSize)
      .composite([{ input: Buffer.from([0,0,0,0]), raw: { width:1, height:1, channels:4 } }])
      .png()
      .toBuffer();

    const wmResized = await sharp(watermark).resize(wmSize).ensureAlpha().modulate({ brightness: 2 }).png().toBuffer();

    const result = await sharp(imgPath)
      .composite([{ input: wmResized, gravity: "southeast", blend: "over" }])
      .jpeg({ quality: 85 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(result);
  } catch (err) {
    console.error(err);
    next();
  }
});

app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[LeO] Servidor corriendo en puerto ${PORT}`);
});
