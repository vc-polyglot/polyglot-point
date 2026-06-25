import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Configurar Google OAuth para LexiPop Math
passport.use('lexipop-google', new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/math/auth/google/callback',
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || '';
      const googleId = profile.id;

      const [existing] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
      if (existing) return done(null, existing);

      const [created] = await db.insert(users).values({
        email,
        name: profile.displayName || '',
        googleId,
        avatarUrl: profile.photos?.[0]?.value || null,
      }).returning();

      return done(null, created);
    } catch (error) {
      done(error as Error);
    }
  }
));

// ========== RUTAS AUTH ==========

router.get('/auth/google', passport.authenticate('lexipop-google', {
  scope: ['profile', 'email']
}));

router.get('/auth/google/callback',
  passport.authenticate('lexipop-google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5174');
  }
);

router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

router.get('/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// ========== EJERCICIOS ==========

router.post('/exercise/complete', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const user = req.user as any;

  if (user.isPro) return res.json({ blocked: false, count: user.exercisesCount });

  const newCount = (user.exercisesCount || 0) + 1;

  await db.update(users)
    .set({ exercisesCount: newCount, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  if (newCount >= 100) {
    return res.json({ blocked: true, count: newCount });
  }

  return res.json({ blocked: false, count: newCount });
});

// RESET — solo para usuarios pro
router.post('/exercise/reset', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const user = req.user as any;

  if (!user.isPro) return res.status(403).json({ error: 'Solo disponible para usuarios premium' });

  await db.update(users)
    .set({ exercisesCount: 0, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({ success: true });
});

// ========== RUTAS REVENUECAT ==========

router.post('/revenuecat/sync', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = req.user as any;
  await db.update(users)
    .set({ isPro: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  res.json({ success: true });
});

router.post('/revenuecat/webhook', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body.event;
  const appUserId = event?.app_user_id;
  if (!appUserId) return res.json({ received: true });

  const isActiveEvent   = ['INITIAL_PURCHASE','RENEWAL','UNCANCELLATION','PRODUCT_CHANGE'].includes(event.type);
  const isInactiveEvent = ['CANCELLATION','EXPIRATION','BILLING_ISSUE'].includes(event.type);

  if (isActiveEvent) {
    await db.update(users).set({ isPro: true, updatedAt: new Date() })
      .where(eq(users.googleId, appUserId));
  } else if (isInactiveEvent) {
    await db.update(users).set({ isPro: false, updatedAt: new Date() })
      .where(eq(users.googleId, appUserId));
  }

  res.json({ received: true });
});

// ========== HELP ENDPOINT ==========

const HELP_SYSTEM_PROMPT = `You are a mental math strategy engine.
Given a mathematical operation, you must:
1. Analyze the structure of the numbers.
2. Select EXACTLY two solution methods that are:
   - Mentally efficient
   - Structurally appropriate for the specific numbers
   - Low cognitive load
3. Do not list more than two methods.
4. Do not mention discarded methods.
5. Do not include filler explanations.
6. Show each method clearly named.
7. Execute both methods step by step using the actual numbers.
8. Keep explanations concise and structural, not pedagogical fluff.
If a method is suboptimal for the given operation, do not include it.
Respond in the same language as instructed.`;

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', fr: 'French',
  de: 'German',  pt: 'Portuguese', it: 'Italian'
};

router.post('/help', async (req, res) => {
  const { question, answer, lang = 'es' } = req.body;

  if (!question || answer === undefined) {
    return res.status(400).json({ error: 'question y answer son requeridos' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY no configurada' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: HELP_SYSTEM_PROMPT },
          { role: 'user', content: `Problem: ${question}\nCorrect answer: ${answer}\nRespond in ${LANG_NAMES[lang] || 'Spanish'}.` }
        ]
      })
    });

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message: string };
    };

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content || '-';
    return res.json({ help: text });

  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'Error al contactar OpenAI' });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'lexipop-math' });
});

export default router;