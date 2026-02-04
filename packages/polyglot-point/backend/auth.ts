import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Solo usa variables _X (las que están en Railway)
const __cid = ((process.env.GOOGLE_CLIENT_ID_X || process.env.GOOGLE_CLIENT_ID || '')).trim();
const __csec = ((process.env.GOOGLE_CLIENT_SECRET_X || process.env.GOOGLE_CLIENT_SECRET || '')).trim();
const __base = ((process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || "")).trim().replace(/\/$/, "");
const __cb = (
  process.env.GOOGLE_CALLBACK_URL_X ||
  process.env.GOOGLE_CALLBACK_URL ||
  (process.env.NODE_ENV === "production"
    ? (__base ? `${__base}/auth/google/callback` : "/auth/google/callback")
    : "http://localhost:3000/auth/google/callback")
).trim();
console.log("[env google]", {
  keys: Object.keys(process.env).filter((k) => k.startsWith("GOOGLE_")),
  idLen: __cid.length,
  secretLen: __csec.length,
  cbUrl: __cb,
});

if (!__cid || !__csec) {
  console.warn("[auth] Google OAuth OFF (missing client id/secret)");
} else {
  console.log("[auth] Google OAuth ON, callback:", __cb);
  passport.use(
    new GoogleStrategy(
      {
        clientID: __cid,
        clientSecret: __csec,
        callbackURL: __cb,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email from Google"), undefined);
          }
          // Buscar usuario existente
          let user = await db
            .select()
            .from(users)
            .where(eq(users.googleId, profile.id))
            .then((r) => r[0]);
          if (!user) {
            // Buscar por email (por si ya existe con otro método)
            user = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .then((r) => r[0]);
            if (user) {
              // Vincular Google a cuenta existente
              await db
                .update(users)
                .set({ googleId: profile.id })
                .where(eq(users.id, user.id));
            } else {
              // Crear usuario nuevo
              const [newUser] = await db
                .insert(users)
                .values({
                  email,
                  googleId: profile.id,
                  name: profile.displayName,
                  avatarUrl: profile.photos?.[0]?.value,
                  planType: "freemium",
                  messagesBank: 20,
                })
                .returning();
              user = newUser;
            }
          }
          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

export default passport;




