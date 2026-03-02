const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Contact form endpoint
app.post('/api/contact', (req, res) => {
  const { name, email, message, lang } = req.body;
  console.log(`[Contact] From: ${name} <${email}> [${lang}]`);
  console.log(`[Contact] Message: ${message}`);
  // Here you can add email sending (nodemailer, etc.)
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Victor Contreras site running on port ${PORT}`);
});
