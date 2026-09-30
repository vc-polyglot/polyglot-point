const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Contact form endpoint
const CONTACT_MAX_LENGTH = 5000;
const contactAttempts = new Map();

function cleanText(value) {
  return String(value ?? '').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 5;

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

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? String(forwarded).split(',')[0].trim()
    : (req.socket?.remoteAddress || 'unknown');

  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      error: 'rate_limited'
    });
  }

  const cleanName = cleanText(name);
  const cleanEmail = cleanText(email);
  const cleanSubject = cleanText(subject);
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

  const resendApiKey = cleanText(process.env.RESEND_API_KEY);
  const contactTo = cleanText(process.env.CONTACT_TO_EMAIL);
  const contactFrom =
    cleanText(process.env.CONTACT_FROM_EMAIL) ||
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
    await sendViaResend({
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Victor Contreras site running on port ${PORT}`);
});
