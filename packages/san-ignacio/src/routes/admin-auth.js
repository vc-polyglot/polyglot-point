import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../lib/db.js";
import { redisClient } from "../lib/redis.js";

export const adminAuth = Router();
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_ACCOUNT_MAX_ATTEMPTS = 10;
const LOGIN_GLOBAL_MAX_ATTEMPTS = 30;

function loginIpKey(req) {
  const ip = String(
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  )
    .trim()
    .replace(/[^a-zA-Z0-9:._-]/g, "_");

  return `san-ignacio:login:ip:${ip}`;
}

function loginAccountKey(req, email) {
  const ip = String(
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  )
    .trim()
    .replace(/[^a-zA-Z0-9:._-]/g, "_");

  const account = Buffer
    .from(String(email || "unknown").trim().toLowerCase())
    .toString("base64url")
    .slice(0, 180);

  return `san-ignacio:login:account:${ip}:${account}`;
}

async function incrementLoginCounter(key) {
  const attempts = await redisClient.incr(key);

  if (attempts === 1) {
    await redisClient.expire(key, LOGIN_WINDOW_SECONDS);
  }

  let ttl = await redisClient.ttl(key);

  if (ttl < 0) {
    await redisClient.expire(key, LOGIN_WINDOW_SECONDS);
    ttl = LOGIN_WINDOW_SECONDS;
  }

  return {
    attempts,
    ttl
  };
}

async function consumeLoginRate(req, email) {
  const ipKey = loginIpKey(req);
  const accountKey = loginAccountKey(req, email);

  const [globalRate, accountRate] = await Promise.all([
    incrementLoginCounter(ipKey),
    incrementLoginCounter(accountKey)
  ]);

  return {
    blocked:
      globalRate.attempts > LOGIN_GLOBAL_MAX_ATTEMPTS ||
      accountRate.attempts > LOGIN_ACCOUNT_MAX_ATTEMPTS,

    retryAfter: Math.max(
      globalRate.ttl,
      accountRate.ttl,
      60
    )
  };
}

async function clearLoginRate(req, email) {
  await Promise.all([
    redisClient.del(loginIpKey(req)),
    redisClient.del(loginAccountKey(req, email))
  ]);
}


adminAuth.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const rate = await consumeLoginRate(req, email);

    if (rate.blocked) {
      res.setHeader(
        "Retry-After",
        String(rate.retryAfter)
      );

      return res.status(429).json({
        error: "Demasiados intentos de acceso. Intenta nuevamente más tarde."
      });
    }

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

    await clearLoginRate(req, email);

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
