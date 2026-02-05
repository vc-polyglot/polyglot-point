import { Router } from 'express';

const router = Router();

// LexiPop Math routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'lexipop-math' });
});

// TODO: Add math-specific routes
// router.post('/solve', ...);
// router.get('/progress/:userId', ...);

export default router;
