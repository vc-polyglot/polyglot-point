import { Router, Request, Response } from "express";
import passport from "./auth";

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login?error=oauth` }),
  (_req: Request, res: Response) => { res.redirect(`${CLIENT_URL}/`); }
);

router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => { res.redirect(`${CLIENT_URL}/`); });
});

export default router;