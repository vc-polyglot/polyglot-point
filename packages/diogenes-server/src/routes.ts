import { Router } from 'express';
import { db, users } from './db';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Auth routes
router.get('/auth/google', (req, res, next) => {
  const passport = req.app.get('passport');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  const passport = req.app.get('passport');
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    successRedirect: process.env.CLIENT_URL
  })(req, res, next);
});

router.get('/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json(null);
  res.json(req.user);
});

router.post('/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

// Reset daily queries at midnight
const resetDailyIfNeeded = async (userId: number) => {
  const today = new Date().toISOString().split('T')[0];
  const user = await db.select().from(users).where(eq(users.id, userId));
  if (user[0]?.lastQueryDate !== today) {
    await db.update(users).set({ dailyQueries: 0, lastQueryDate: today }).where(eq(users.id, userId));
  }
};

// Explain endpoint
router.post('/api/explain', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });

  const user = req.user as any;
  const { text, philosopher } = req.body;

  if (!text) return res.status(400).json({ error: 'Texto requerido' });

  await resetDailyIfNeeded(user.id);

  const fresh = await db.select().from(users).where(eq(users.id, user.id));
  const currentUser = fresh[0];

  if (!currentUser.isPremium && (currentUser.dailyQueries ?? 0) >= 3) {
    return res.status(403).json({ error: 'Límite diario alcanzado' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en filosofía antigua que explica textos de manera clara, directa y sin academicismos. 
          El usuario seleccionó un fragmento de ${philosopher ?? 'Diógenes Laercio'}.
          Responde siempre en 3 partes claramente separadas:
          1. QUÉ SIGNIFICA: explica el fragmento en términos simples
          2. POR QUÉ IMPORTÓ: contexto histórico en 2 líneas
          3. PA QUÉ TE SIRVE: aplicación práctica y honesta en la vida de hoy
          Sé conciso, directo y sin sermones. Máximo 150 palabras en total.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 300
    });

    const explanation = completion.choices[0].message.content;

    await db.update(users)
      .set({ dailyQueries: (currentUser.dailyQueries ?? 0) + 1 })
      .where(eq(users.id, user.id));

    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar OpenAI' });
  }
});

export default router;