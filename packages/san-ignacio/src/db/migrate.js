import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(sql);
  console.log("Migración completada.");
} catch (error) {
  console.error("Falló la migración:", error);
  process.exitCode = 1;
} finally {
  await db.end();
}
