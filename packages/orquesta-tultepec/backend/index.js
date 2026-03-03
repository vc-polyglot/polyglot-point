const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { nombre, email, telefono, mensaje, tipo } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Nombre, email y mensaje son requeridos.' });
  }

  console.log('📩 Nueva solicitud de contratación:');
  console.log(`   Nombre:   ${nombre}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Teléfono: ${telefono || '—'}`);
  console.log(`   Tipo:     ${tipo || '—'}`);
  console.log(`   Mensaje:  ${mensaje}`);

  // TODO: conectar nodemailer o servicio externo (SendGrid, Resend, etc.)
  res.json({ ok: true, message: 'Solicitud recibida. Nos pondremos en contacto pronto.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🎻 Orquesta Sinfónica Juvenil de Tultepec`);
  console.log(`   Servidor corriendo en http://localhost:${PORT}`);
});
