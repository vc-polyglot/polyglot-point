import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../lib/db.js";

export const adminAuth = Router();

adminAuth.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const result = await db.query(`
      SELECT id, name, email, password_hash, role, active
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
    `, [email]);

    const user = result.rows[0];

    if (!user || !user.active) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => error ? reject(error) : resolve());
    });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    await new Promise((resolve, reject) => {
      req.session.save((error) => error ? reject(error) : resolve());
    });

    res.json({ user: req.session.user });
  } catch (error) {
    next(error);
  }
});

adminAuth.get("/session", (req, res) => {
  res.json({ user: req.session?.user || null });
});

adminAuth.post("/logout", async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => error ? reject(error) : resolve());
    });
    res.clearCookie("sanIgnacio.sid");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
