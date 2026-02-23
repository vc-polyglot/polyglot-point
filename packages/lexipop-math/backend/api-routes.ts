import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });

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

  if (newCount >=100) {
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

// ========== RUTAS STRIPE ==========

router.post('/checkout', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'priceId is required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5174'}?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5174'}?canceled=true`,
      customer_email: (req.user as any).email,
      // Guardar el user id para identificarlo en el webhook
      metadata: { userId: (req.user as any).id },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ⚠️  Esta ruta necesita raw body — asegúrate de que en tu index/server principal
//     tengas ANTES de express.json():
//     app.use('/api/math/stripe/webhook', express.raw({ type: 'application/json' }));
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    // ✅ Pago completado → activar isPro
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;

      if (userId) {
        await db.update(users)
          .set({ isPro: true, stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(users.id, userId));
        console.log(`✅ Usuario ${userId} activado como Pro`);
      }
      break;
    }

    // ❌ Suscripción cancelada → quitar isPro
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.update(users)
        .set({ isPro: false, updatedAt: new Date() })
        .where(eq(users.stripeCustomerId, customerId));
      console.log(`❌ Suscripción cancelada para customer ${customerId}`);
      break;
    }
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