const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3005;

app.use((req, res, next) => {
  res.removeHeader('Accept-Ranges');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/fotos', (req, res) => {
  const fotosDir = path.join(__dirname, '../public/fotos');
  const carpetas = ['aquiles', 'copito', 'elvis', 'recuerdos'];
  const extensiones = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  let fotos = [];
  carpetas.forEach(c => {
    const ruta = path.join(fotosDir, c);
    if (!fs.existsSync(ruta)) return;
    fs.readdirSync(ruta).forEach(f => {
      if (extensiones.includes(path.extname(f).toLowerCase()))
        fotos.push(`/fotos/${c}/${f}`);
    });
  });
  res.json({ fotos, total: fotos.length });
});

app.listen(PORT, () => console.log(`\n🐾 El Arca de Rox corriendo en http://localhost:${PORT}\n`));