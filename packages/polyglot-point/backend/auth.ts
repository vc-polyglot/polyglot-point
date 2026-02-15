import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db-new";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID_X!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_X!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL_X || "http://localhost:3000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }
        let [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
          [user] = await db.insert(users).values({
            email,
            googleId: profile.id,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          }).returning();
        }
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
