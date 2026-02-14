import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from '@platform/polyglot-point/backend/auth';
import polyglotRoutes from '@platform/polyglot-point/backend/api-routes';
import mathRoutes from '@platform/lexipop-math/backend/api-routes';

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  // Agrega aquí tu dominio de Vercel cuando lo tengas:
  // 'https://lexipop-math.vercel.app',
  // 'https://polyglot-point.vercel.app',
];

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true
}));

// Stripe webhook necesita el body RAW — va ANTES de express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    apps: ['polyglot-point', 'lexipop-math']
  });
});

// Routes
app.use('/api', polyglotRoutes);
app.use('/api/math', mathRoutes);

app.listen(PORT, () => {
  console.log('API Gateway running on port ' + PORT);
  console.log('Polyglot Point: http://localhost:' + PORT);
  console.log('LexiPop Math: http://localhost:' + PORT + '/api/math');
});
