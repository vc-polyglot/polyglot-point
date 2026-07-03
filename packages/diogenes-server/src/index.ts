import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import path from 'path';
import passport from './auth';
import router from './routes';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const PgStore = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(router);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Servir frontend
const frontendPath = path.join(__dirname, '../../diogenes/dist');
app.use(express.static(frontendPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Diógenes server corriendo en puerto ${PORT}`);
});