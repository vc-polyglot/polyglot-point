const express = require('express');
const path = require('path');
const https = require('https');

function createApp({ env = process.env, sendMail } = {}) {
const app = express();
app.disable('x-powered-by');
// Railway is the only reverse proxy in the deployed service. Local requests use the socket IP.
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  let pathname;
  try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
  if (/\.(?:backup|bak)(?:[.-].*)?$/i.test(pathname)) return res.sendStatus(404);
  next();
});
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '../public'), {
  dotfiles: 'deny',
  setHeaders(res, file) {
    res.set('Cache-Control', /\.(?:jpe?g|png|svg|webp)$/i.test(file)
      ? 'public, max-age=86400' : 'no-cache');
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// Contact form endpoint
const CONTACT_MAX_LENGTH = 5000;
const contactAttempts = new Map();
const SUBJECTS = {
  concert: 'Concierto / Recital', masterclass: 'Clase magistral',
  festival: 'Festival', media: 'Prensa', other: 'Otro'
};

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 5;

  // Bound memory growth without keeping a background timer alive.
  for (const [key, attempts] of contactAttempts) {
    if (!attempts.some(timestamp => now - timestamp < windowMs)) contactAttempts.delete(key);
  }

  const previous = contactAttempts.get(ip) || [];
  const recent = previous.filter(timestamp => (now - timestamp) < windowMs);

  if (recent.length >= maxAttempts) {
    contactAttempts.set(ip, recent);
    return true;
  }

  recent.push(now);
  contactAttempts.set(ip, recent);
  return false;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sendViaResend({
  apiKey,
  from,
  to,
  replyTo,
  subject,
  html,
  text
}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      text
    });

    const request = https.request({
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'victorcontreras.mx/1.0'
      }
    }, response => {
      let body = '';

      response.setEncoding('utf8');

      response.on('data', chunk => {
        body += chunk;
      });

      response.on('end', () => {
        let parsed;

        try {
          parsed = body ? JSON.parse(body) : {};
        } catch {
          parsed = { raw: body };
        }

        const status = response.statusCode || 500;

        if (status >= 200 && status < 300) {
          resolve(parsed);
          return;
        }

        const error = new Error(`Resend HTTP ${status}`);
        error.status = status;
        error.response = parsed;
        reject(error);
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error('Resend request timeout'));
    });

    request.on('error', reject);

    request.write(payload);
    request.end();
  });
}
app.post('/api/contact', async (req, res) => {
  const {
    name,
    email,
    subject,
    message,
    lang,
    website
  } = req.body || {};

  // Honeypot: debe permanecer vacío.
  if (cleanText(website)) {
    return res.status(400).json({
      success: false,
      error: 'invalid_submission'
    });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    res.set('Retry-After', '600');
    return res.status(429).json({
      success: false,
      error: 'rate_limited'
    });
  }

  const cleanName = cleanText(name);
  const cleanEmail = cleanText(email);
  const rawSubject = cleanText(subject);
  const cleanSubject = SUBJECTS[rawSubject] || rawSubject;
  const cleanMessage = cleanText(message);
  const cleanLang = cleanText(lang) || 'es';

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return res.status(400).json({
      success: false,
      error: 'missing_fields'
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'invalid_email'
    });
  }

  if (
    cleanName.length > 200 ||
    cleanEmail.length > 320 ||
    cleanSubject.length > 300 ||
    cleanMessage.length > CONTACT_MAX_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      error: 'too_long'
    });
  }

  const resendApiKey = cleanText(env.RESEND_API_KEY);
  const contactTo = cleanText(env.CONTACT_TO_EMAIL);
  const contactFrom =
    cleanText(env.CONTACT_FROM_EMAIL) ||
    'Víctor Contreras <contacto@victorcontreras.mx>';

  if (!resendApiKey || !contactTo) {
    return res.status(503).json({
      success: false,
      error: 'mail_not_configured'
    });
  }

  const subjectLine = cleanSubject
    ? `Contacto web: ${cleanSubject}`
    : 'Nuevo mensaje desde victorcontreras.mx';

  const html = `
    <h2>Nuevo mensaje desde victorcontreras.mx</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(cleanName)}</p>
    <p><strong>Correo:</strong> ${escapeHtml(cleanEmail)}</p>
    <p><strong>Asunto:</strong> ${escapeHtml(cleanSubject || 'Sin asunto')}</p>
    <p><strong>Idioma:</strong> ${escapeHtml(cleanLang)}</p>
    <hr>
    <p>${escapeHtml(cleanMessage).replace(/\n/g, '<br>')}</p>
  `;

  const text = [
    'Nuevo mensaje desde victorcontreras.mx',
    '',
    `Nombre: ${cleanName}`,
    `Correo: ${cleanEmail}`,
    `Asunto: ${cleanSubject || 'Sin asunto'}`,
    `Idioma: ${cleanLang}`,
    '',
    cleanMessage
  ].join('\n');

  try {
    await (sendMail || sendViaResend)({
      apiKey: resendApiKey,
      from: contactFrom,
      to: contactTo,
      replyTo: cleanEmail,
      subject: subjectLine,
      html,
      text
    });

    console.log('[Contact] Message delivered through Resend');

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(`[Contact] Delivery failed: ${error.message}`);

    return res.status(502).json({
      success: false,
      error: 'mail_delivery_failed'
    });
  }
});
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'not_found' });
});
app.use((req, res) => {
  res.status(404).type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página no encontrada | Víctor Contreras</title><main><h1>Página no encontrada</h1><p>La dirección que buscas no está disponible.</p><a href="/">Volver al sitio de Víctor Contreras</a></main></html>');
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ success: false, error: status === 413 ? 'too_long' : status === 400 ? 'invalid_submission' : 'server_error' });
});
return app;
}

module.exports = { createApp };
if (require.main === module) {
  const PORT = process.env.PORT || 3003;
  createApp().listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`Victor Contreras site running on port ${PORT}`);
  });
}
