import { chatHandler } from './routes/chat.routes';
import { Router } from 'express';
import authRoutes from './authRoutes';
import billingRoutes from './routes/billing.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'polyglot-point' });
});

// Auth routes (Google OAuth, etc.)
router.use('/auth', authRoutes);

// Billing routes
router.use('/billing', billingRoutes);

// Chat endpoint
router.post('/chat', chatHandler);

// User info
router.get('/me', (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      planType: user.planType || "freemium",
      messagesBank: user.messagesBank ?? 20,
      remainingMessages: user.messagesBank ?? 20,
    });
    return;
  }
  
  res.status(401).json({ error: "No autenticado" });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    req.session.destroy((err2) => {
      if (err2) return res.status(500).json({ error: "Error destruyendo sesión" });
      res.json({ message: "Sesión cerrada" });
    });
  });
});

export default router;