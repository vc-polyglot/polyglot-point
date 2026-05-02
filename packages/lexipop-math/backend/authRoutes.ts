import { Router, Request, Response } from "express";
import passport from "./auth";
import { OAuth2Client } from "google-auth-library";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const WEB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(WEB_CLIENT_ID);

// ── Token login (Android app) ─────────────────────────────────────────────────
router.post("/google/token", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken requerido" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "Token inválido" });

    const { sub: googleId, email = "", name = "", picture: avatarUrl = null } = payload;

    const [existing] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    let user = existing;

    if (!user) {
      const [created] = await db.insert(users).values({ email, name, googleId, avatarUrl }).returning();
      user = created;
    }

    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });

    return res.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error("[Google Token Auth]", err);
    return res.status(401).json({ error: "Autenticación fallida" });
  }
});

// ── Initiate Google OAuth flow ────────────────────────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ── Google OAuth callback ─────────────────────────────────────────────────────
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login?error=oauth` }),
  (_req: Request, res: Response) => {
    res.redirect(`${CLIENT_URL}/`);
  }
);

// ── Logout ────────────────────────────────────────────────────────────────────
router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => res.redirect(`${CLIENT_URL}/`));
});

export default router;