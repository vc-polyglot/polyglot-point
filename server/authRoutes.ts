import { Router } from "express";
import passport from "./auth";

const router = Router();

// Iniciar login con Google
router.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));

// Callback de Google
router.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?error=auth_failed",
  }),
  (_req, res) => {
    res.redirect("/?auth=success");
  }
);

// Obtener usuario actual
router.get("/api/me", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      planType: user.planType,
      messagesBank: user.messagesBank,
      activeLanguage: user.activeLanguage,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Logout
router.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

export default router;