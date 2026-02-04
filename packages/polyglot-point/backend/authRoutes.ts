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

export default router;

