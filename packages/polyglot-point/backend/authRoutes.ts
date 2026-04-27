import { Router } from "express";
import passport from "./auth";

const router = Router();

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
    (_req, res) => {
      res.redirect(process.env.NODE_ENV === "production" ? "/?auth=success" : "http://localhost:5173/?auth=success");
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

// Eliminar cuenta
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

export default router;