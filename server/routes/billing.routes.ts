import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { db } from '../db';
import { users, PLAN_CONFIG } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/create-checkout-session', async (req: Request, res: Response) => {`n  try {`n    console.log(\"[Checkout DEBUG PREAUTH]\", { hasIsAuth: typeof (req as any).isAuthenticated === \"function\", isAuth: (req as any).isAuthenticated?.(), hasUser: !!(req as any).user, user: (req as any).user && { id: (req as any).user.id, email: (req as any).user.email } });`nif (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = req.user as any;
    const { plan } = req.body;

    if (plan !== 'premium' && plan !== 'pro') {
      return res.status(400).json({ error: 'Plan invÃ¡lido. Usa "premium" o "pro"' });
    }

    // Obtener datos actuales del usuario
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    console.log("[Checkout DEBUG]", { reqUserId: user?.id, reqEmail: user?.email, dbUserId: dbUser?.id, dbEmail: dbUser?.email, dbStripeCustomerId: dbUser?.stripeCustomerId });
console.log("[Checkout DEBUG]", { reqUserId: user?.id, reqEmail: user?.email, dbUserId: dbUser?.id, dbEmail: dbUser?.email, dbStripeCustomerId: dbUser?.stripeCustomerId });

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si ya tiene suscripciÃ³n activa, actualizar en lugar de crear nueva
    if (dbUser.stripeSubscriptionId) {
      try {
        const result = await stripeService.updateSubscription({
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
        // Si falla la actualizaciÃ³n, crear nueva sesiÃ³n
      }
    }

    // Crear nueva sesiÃ³n de checkout
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const result = await stripeService.createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
      customerId: dbUser.stripeCustomerId || undefined,
      successUrl: `${clientUrl}/?upgraded=${plan}`,
      cancelUrl: `${clientUrl}/?canceled=true`
    });

    res.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Error al crear sesiÃ³n de pago' });
  }
});

export default router;

