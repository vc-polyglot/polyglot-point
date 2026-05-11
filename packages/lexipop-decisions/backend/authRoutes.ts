import { Router, Request, Response } from "express";
import passport from "./auth";
import { OAuth2Client } from "google-auth-library";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const router = Router();
const CLIENT_URL      = process.env.CLIENT_URL    || "http://localhost:5173";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── Flujo OAuth web ───────────────────────────────────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login?error=oauth` }),
  (_req: Request, res: Response) => { res.redirect(`${CLIENT_URL}/`); }
);

router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => { res.redirect(`${CLIENT_URL}/`); });
});

// ── Endpoint nativo: recibe idToken del APK ───────────────────────────────────
router.post("/google/token", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken requerido" });

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "Token inválido" });

    const googleId  = payload.sub;
    const email     = payload.email     || "";
    const name      = payload.name      || "";
    const avatarUrl = payload.picture   || null;

    let [user] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ email, name, googleId, avatarUrl }).returning();
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Error al iniciar sesión" });
      return res.json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      });
    });
  } catch (err: any) {
    console.error("[Auth] /google/token error:", err);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
});

export default router;