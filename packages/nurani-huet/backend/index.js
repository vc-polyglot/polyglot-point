const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'none');
  res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline'");
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Nurani Huet · corriendo en http://localhost:${PORT}`);
});
