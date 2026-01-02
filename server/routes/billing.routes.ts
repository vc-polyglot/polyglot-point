import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';

const router = Router();

// Crear sesión de checkout
router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const user = req.user as any;
    const { plan } = req.body;
    
    if (plan !== 'premium' && plan !== 'pro') {
      return res.status(400).json({ error: 'Plan inválido. Usa "premium" o "pro"' });
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    const result = await stripeService.createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
      successUrl: `${clientUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${clientUrl}/billing/cancel`
    });
    
    res.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

export default router;