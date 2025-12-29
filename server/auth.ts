import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: (process.env.GOOGLE_CALLBACK_URL || (process.env.NODE_ENV === "production" ? "/auth/google/callback" : "http://localhost:5173/auth/google/callback")),
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
