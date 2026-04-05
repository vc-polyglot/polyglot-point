import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { db } from '../db';
import { users, PLAN_CONFIG } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    console.log("[Checkout DEBUG PREAUTH]", {
      hasIsAuth: typeof (req as any).isAuthenticated === "function",
      isAuth: typeof (req as any).isAuthenticated === "function" ? (req as any).isAuthenticated() : undefined,
      hasUser: !!(req as any).user,
      user: (req as any).user && { id: (req as any).user.id, email: (req as any).user.email }
    });
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const user = req.user as any;
    const { plan } = req.body;
    if (plan !== 'premium' && plan !== 'pro') {
      return res.status(400).json({ error: 'Plan inválido. Usa "premium" o "pro"' });
    }
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    console.log("[Checkout DEBUG]", {
      reqUserId: user?.id,
      reqEmail: user?.email,
      dbUserId: dbUser?.id,
      dbEmail: dbUser?.email,
      dbStripeCustomerId: dbUser?.stripeCustomerId,
      dbStripeSubscriptionId: dbUser?.stripeSubscriptionId
    });
    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    try {
      await stripeService.updateSubscription({
        subscriptionId: dbUser.stripeSubscriptionId,
        newPlan: plan
      });
      const config = PLAN_CONFIG[plan];
      await db.update(users).set({
        planType: plan,
        messagesBank: config.baseMessages,
        premiumMessagesToday: 0,
        premiumLastResetDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
      return res.json({
        upgraded: true,
        plan,
        message: `Plan actualizado a ${plan}`
      });
    } catch (err: any) {
      console.error('Error updating subscription:', err);
    }
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const result = await stripeService.createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
      customerId: dbUser.stripeCustomerId || undefined,
      successUrl: `${clientUrl}/?upgraded=${plan}`,
      cancelUrl: `${clientUrl}/?canceled=true`
    });
    return res.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// ── Google Play: verificar compra ─────────────────────────────────────────
router.post('/verify-purchase', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const user = req.user as any;
    const { purchaseToken, productId } = req.body;

    if (!purchaseToken || !productId) {
      return res.status(400).json({ error: 'purchaseToken y productId requeridos' });
    }

    console.log('[verify-purchase]', { userId: user.id, productId, purchaseToken: purchaseToken.slice(0, 20) + '...' });

    // TODO: cuando llegue Service Account JSON, agregar verificación con googleapis:
    // const { google } = await import('googleapis');
    // const auth = new google.auth.GoogleAuth({ keyFile: '...', scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
    // const androidpublisher = google.androidpublisher({ version: 'v3', auth });
    // await androidpublisher.purchases.subscriptions.acknowledge({ packageName: 'com.polyglot.point', subscriptionId: productId, token: purchaseToken, requestBody: {} });

    // Activar plan pro en DB
    const plan = 'pro';
    const config = PLAN_CONFIG[plan];
    await db.update(users).set({
      planType: plan,
      messagesBank: config.baseMessages,
      premiumMessagesToday: 0,
      premiumLastResetDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    console.log('[verify-purchase] plan pro activado para usuario', user.id);
    return res.json({ success: true, plan });
  } catch (error) {
    console.error('[verify-purchase] error:', error);
    return res.status(500).json({ error: 'Error al verificar compra' });
  }
});

export default router;
