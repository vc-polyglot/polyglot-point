import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

// ─── Serialize / Deserialize ──────────────────────────────────────────────────
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

// ─── Google Strategy ─────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const CALLBACK_URL         = process.env.GOOGLE_CALLBACK_URL  || "/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("[Auth] WARN: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados.");
}

passport.use(
  new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value || "";
        const name      = profile.displayName || "";
        const googleId  = profile.id;
        const avatarUrl = profile.photos?.[0]?.value || null;

        // Find or create user
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1);

        if (existing) {
          return done(null, existing);
        }

        const [created] = await db
          .insert(users)
          .values({ email, name, googleId, avatarUrl })
          .returning();

        return done(null, created);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;