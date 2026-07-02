import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db, users } from './db';
import { eq } from 'drizzle-orm';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const existing = await db.select().from(users).where(eq(users.googleId, profile.id));

    if (existing.length > 0) {
      return done(null, existing[0]);
    }

    const newUser = await db.insert(users).values({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0].value ?? '',
      avatar: profile.photos?.[0].value
    }).returning();

    return done(null, newUser[0]);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await db.select().from(users).where(eq(users.id, id));
    done(null, result[0] ?? null);
  } catch (err) {
    done(err);
  }
});

export default passport;