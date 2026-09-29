const express = require('express');
const path = require('path');

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

app.post('/api/contact', (req, res) => {
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

  // Aún no existe proveedor de correo conectado.
  // Por tanto NO devolver éxito falso.
  console.log(`[Contact] Valid submission received [${cleanLang}]`);

  return res.status(503).json({
    success: false,
    error: 'mail_not_configured'
  });
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Victor Contreras site running on port ${PORT}`);
});
