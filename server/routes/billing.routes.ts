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

    // Obtener datos actuales del usuario
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

    // Si ya tiene suscripción activa, actualizar en lugar de crear nueva
    if (dbUser.stripeSubscriptionId) {
      try {
        await stripeService.updateSubscription({
          subscriptionId: dbUser.stripeSubscriptionId,
          newPlan: plan
        });

        // Actualizar DB
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
        // Si falla la actualización, crear nueva sesión
      }
    }

    // Crear nueva sesión de checkout
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

export default router;