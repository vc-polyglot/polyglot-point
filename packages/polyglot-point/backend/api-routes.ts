import { Router } from 'express';

const router = Router();

// Polyglot Point routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'polyglot-point' });
});

// TODO: Import existing routes from index.ts
// router.use('/chat', chatRoutes);
// router.use('/auth', authRoutes);

export default router;
