import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../lib/db.js";

const name = String(process.env.ADMIN_NAME || "Secretaría").trim();
const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");

if (!email || !password) {
  console.error("ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(`
    INSERT INTO users (name, email, password_hash, role, active)
    VALUES ($1, $2, $3, 'admin', TRUE)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = 'admin',
      active = TRUE,
      updated_at = NOW()
  `, [name, email, passwordHash]);

  console.log(`Administrador listo: ${email}`);
} catch (error) {
  console.error("No se pudo crear/actualizar el administrador:", error);
  process.exitCode = 1;
} finally {
  await db.end();
}
