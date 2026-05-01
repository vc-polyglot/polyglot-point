import { Router } from "express";
import passport from "./auth";
import crypto from "crypto";

const router = Router();

const pendingTokens = new Map<string, number>();

const googleOAuthEnabled = Boolean(
  (process.env.GOOGLE_CLIENT_ID_X || process.env.GOOGLE_CLIENT_ID) &&
  (process.env.GOOGLE_CLIENT_SECRET_X || process.env.GOOGLE_CLIENT_SECRET)
);

if (googleOAuthEnabled) {
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );
  router.get(
    "/google/callback",
    passport.authenticate("google", {
      failureRedirect: process.env.NODE_ENV === "production" ? "/?error=auth_failed" : "http://localhost:5173/?error=auth_failed",
    }),
    (req: any, res) => {
      if (process.env.NODE_ENV === "production") {
        const token = crypto.randomBytes(16).toString("hex");
        pendingTokens.set(token, req.user.id);
        setTimeout(() => pendingTokens.delete(token), 60000);
        res.redirect(`com.polyglot.point://auth/success?token=${token}`);
      } else {
        res.redirect("http://localhost:5173/?auth=success");
      }
    }
  );
} else {
  router.get("/google", (_req, res) => {
    res.status(501).json({ error: "google_oauth_disabled" });
  });
  router.get("/google/callback", (_req, res) => {
    res.status(501).json({ error: "google_oauth_disabled" });
  });
}

router.get("/session", async (req: any, res: any) => {
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: "missing token" });
  const userId = pendingTokens.get(token);
  if (!userId) return res.status(401).json({ error: "invalid or expired token" });
  pendingTokens.delete(token);
  const { db } = await import("./db-new");
  const { users } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return res.status(404).json({ error: "user not found" });
  req.login(user, (err: any) => {
    if (err) return res.status(500).json({ error: "login failed" });
    res.json({ ok: true });
  });
});

router.delete("/delete-account", async (req: any, res: any) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const user = req.user as any;
    const { db } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(users).where(eq(users.id, user.id));
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });
  } catch (error) {
    console.error("[delete-account] error:", error);
    res.status(500).json({ error: "Error al eliminar cuenta" });
  }
});

// Endpoint para @daniele-rolli/capacitor-google-auth
router.post("/google/token", async (req: any, res: any) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken requerido" });

    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID
    );

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "Token inválido" });
    if (!payload.email_verified) return res.status(401).json({ error: "Email no verificado" });

    const email = payload.email!;
    const name = payload.name || email.split("@")[0];
    const googleId = payload.sub;
    const avatarUrl = payload.picture || null;

    const { db } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      const [created] = await db.insert(users).values({
        email,
        name,
        googleId,
        avatarUrl,
        planType: "freemium",
        messagesBank: 20,
      }).returning();
      user = created;
    } else if (!user.googleId) {
      const [updated] = await db.update(users)
        .set({ googleId, avatarUrl: avatarUrl || user.avatarUrl })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
    }

    req.login(user, (err: any) => {
      if (err) return res.status(500).json({ error: "Error al iniciar sesión" });
      res.json({ ok: true });
    });

  } catch (error: any) {
    console.error("[google/token] error:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
});

export default router;