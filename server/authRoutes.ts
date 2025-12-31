import { Router } from "express";
import passport from "./auth";

const router = Router();

// Iniciar login con Google
// Montado como app.use("/auth", router) => endpoint final: GET /auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Callback de Google
// Endpoint final: GET /auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?error=auth_failed",
  }),
  (_req, res) => {
    res.redirect("/?auth=success");
  }
);

export default router;
