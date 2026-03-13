// ══════════════════════════════════════════════════════════════
//  El Arca de Rox — backend/index.js
//  Compatible con estructura existente: public/fotos/ y public/audio/
// ══════════════════════════════════════════════════════════════

const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3005;

// ──────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arca2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'rox-super-secreta-2024';

// ──────────────────────────────────────────────────────────────
//  RUTAS DE CARPETAS  (misma estructura que ya existe)
// ──────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, '../public');
const DATA_DIR   = path.join(__dirname, '../data');

//  Fotos:  public/fotos/aquiles/  copito/  elvis/  recuerdos/  hero/  rox/
//  Audio:  public/audio/          (fondo2-6 + aquiles/copito/elvis ya están aquí)

const FOTOS_DIR = path.join(PUBLIC_DIR, 'fotos');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');

const ANIMALS = ['aquiles', 'copito', 'elvis'];
const EXT_IMG  = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const EXT_AUD  = ['.mp3', '.ogg', '.wav', '.m4a'];

// Crear carpetas que no existan
[
  DATA_DIR,
  path.join(FOTOS_DIR, 'hero'),
  path.join(FOTOS_DIR, 'rox'),
  AUDIO_DIR,
  ...ANIMALS.map(a => path.join(FOTOS_DIR, a)),
].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ──────────────────────────────────────────────────────────────
//  JSON DE ESTADO
// ──────────────────────────────────────────────────────────────
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const CONFIG_FILE  = path.join(DATA_DIR, 'config.json');

function readJSON(file, defaults) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return defaults; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

if (!fs.existsSync(STORIES_FILE))
  writeJSON(STORIES_FILE, { aquiles: '', copito: '', elvis: '' });

if (!fs.existsSync(CONFIG_FILE))
  writeJSON(CONFIG_FILE, {
    heroPhoto: null,
    aquiles:   { mainPhoto: null },
    copito:    { mainPhoto: null },
    elvis:     { mainPhoto: null },
    rox:       { slots: Array(10).fill(null) },
  });

// ──────────────────────────────────────────────────────────────
//  MULTER
// ──────────────────────────────────────────────────────────────
function imgFilter(req, file, cb) {
  cb(null, EXT_IMG.includes(path.extname(file.originalname).toLowerCase()));
}
function audFilter(req, file, cb) {
  cb(null, EXT_AUD.includes(path.extname(file.originalname).toLowerCase()));
}
function uniqueName(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
}

// Fotos animales → public/fotos/<animal>/
const uploadAnimal = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(FOTOS_DIR, req.params.animal)),
    filename: uniqueName,
  }),
  fileFilter: imgFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Hero → public/fotos/hero/
const uploadHero = multer({
  storage: multer.diskStorage({
    destination: () => path.join(FOTOS_DIR, 'hero'),
    filename: uniqueName,
  }),
  fileFilter: imgFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Loop → public/audio/loop-<ts>.mp3
const uploadLoop = multer({
  storage: multer.diskStorage({
    destination: () => AUDIO_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'loop-' + Date.now() + ext);
    },
  }),
  fileFilter: audFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Canción animal → public/audio/<animal>.mp3  (reemplaza la anterior)
const uploadAnimalSong = multer({
  storage: multer.diskStorage({
    destination: () => AUDIO_DIR,
    filename: (req, file, cb) => {
      // Borrar archivo anterior del mismo animal antes de guardar
      try {
        fs.readdirSync(AUDIO_DIR)
          .filter(f => f.startsWith(req.params.animal + '.') &&
                       EXT_AUD.includes(path.extname(f).toLowerCase()))
          .forEach(f => fs.unlinkSync(path.join(AUDIO_DIR, f)));
      } catch {}
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, req.params.animal + ext);
    },
  }),
  fileFilter: audFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Rox → public/fotos/rox/slot-<N>.ext
const uploadRox = multer({
  storage: multer.diskStorage({
    destination: () => path.join(FOTOS_DIR, 'rox'),
    filename: (req, file, cb) => {
      const slot   = parseInt(req.params.slot, 10);
      const roxDir = path.join(FOTOS_DIR, 'rox');
      try {
        fs.readdirSync(roxDir)
          .filter(f => new RegExp(`^slot-${slot}[.-]`).test(f) ||
                       f === `slot-${slot}${path.extname(f)}`)
          .forEach(f => fs.unlinkSync(path.join(roxDir, f)));
      } catch {}
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `slot-${slot}${ext}`);
    },
  }),
  fileFilter: imgFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ──────────────────────────────────────────────────────────────
//  MIDDLEWARE
// ──────────────────────────────────────────────────────────────
app.use((req, res, next) => { res.removeHeader('Accept-Ranges'); next(); });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' },
}));
app.use(express.static(PUBLIC_DIR));

// ──────────────────────────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'No autorizado' });
}

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Contraseña incorrecta' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ──────────────────────────────────────────────────────────────
//  API PÚBLICA
// ──────────────────────────────────────────────────────────────

// /api/fotos  ← IGUAL QUE ANTES, el index.html sigue funcionando
app.get('/api/fotos', (req, res) => {
  const carpetas = ['aquiles', 'copito', 'elvis', 'recuerdos'];
  let fotos = [];
  carpetas.forEach(c => {
    const ruta = path.join(FOTOS_DIR, c);
    if (!fs.existsSync(ruta)) return;
    fs.readdirSync(ruta).forEach(f => {
      if (EXT_IMG.includes(path.extname(f).toLowerCase()))
        fotos.push(`/fotos/${c}/${f}`);
    });
  });
  res.json({ fotos, total: fotos.length });
});

// /api/fotos/:animal  ← lista de un animal para el admin
app.get('/api/fotos/:animal', (req, res) => {
  const { animal } = req.params;
  if (![...ANIMALS, 'recuerdos'].includes(animal))
    return res.status(400).json({ error: 'Carpeta inválida' });
  const dir = path.join(FOTOS_DIR, animal);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => EXT_IMG.includes(path.extname(f).toLowerCase()))
    : [];
  res.json(files.map(f => `/fotos/${animal}/${f}`));
});

// /api/stories
app.get('/api/stories', (req, res) => {
  res.json(readJSON(STORIES_FILE, {}));
});

// /api/config
app.get('/api/config', (req, res) => {
  res.json(readJSON(CONFIG_FILE, {}));
});

// /api/audio/loop  ← canciones con prefijo "loop-"
app.get('/api/audio/loop', (req, res) => {
  const files = fs.existsSync(AUDIO_DIR)
    ? fs.readdirSync(AUDIO_DIR)
        .filter(f => f.startsWith('loop-') && EXT_AUD.includes(path.extname(f).toLowerCase()))
    : [];
  res.json(files.map(f => `/audio/${f}`));
});

// /api/audio/canciones  ← { aquiles: "/audio/aquiles.mp3", ... }
app.get('/api/audio/canciones', (req, res) => {
  const result = {};
  ANIMALS.forEach(a => {
    const found = fs.readdirSync(AUDIO_DIR)
      .find(f => f.startsWith(a + '.') && EXT_AUD.includes(path.extname(f).toLowerCase()));
    if (found) result[a] = `/audio/${found}`;
  });
  res.json(result);
});

// /api/rox  ← 10 slots (verifica que los archivos sigan existiendo)
app.get('/api/rox', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  const slots  = (config.rox && config.rox.slots) || Array(10).fill(null);
  const synced = slots.map(url => {
    if (!url) return null;
    return fs.existsSync(path.join(PUBLIC_DIR, url)) ? url : null;
  });
  res.json(synced);
});

// ──────────────────────────────────────────────────────────────
//  API ADMIN
// ──────────────────────────────────────────────────────────────

// ── HISTORIAS ──
app.put('/api/admin/stories/:animal', requireAuth, (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const s = readJSON(STORIES_FILE, {});
  s[animal] = req.body.text || '';
  writeJSON(STORIES_FILE, s);
  res.json({ ok: true });
});

// ── FOTOS ANIMALES ──
app.post('/api/admin/fotos/:animal', requireAuth, (req, res, next) => {
  if (!ANIMALS.includes(req.params.animal)) return res.status(400).json({ error: 'Animal inválido' });
  next();
}, uploadAnimal.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ ok: true, url: `/fotos/${req.params.animal}/${req.file.filename}` });
});

app.delete('/api/admin/fotos/:animal/:filename', requireAuth, (req, res) => {
  const { animal, filename } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const fp = path.join(FOTOS_DIR, animal, path.basename(filename));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  const config = readJSON(CONFIG_FILE, {});
  if (config[animal] && config[animal].mainPhoto === path.basename(filename)) {
    config[animal].mainPhoto = null;
    writeJSON(CONFIG_FILE, config);
  }
  res.json({ ok: true });
});

app.put('/api/admin/fotos/:animal/main', requireAuth, (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config[animal]) config[animal] = {};
  config[animal].mainPhoto = req.body.filename || null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── HERO ──
app.post('/api/admin/hero', requireAuth, uploadHero.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  const heroDir = path.join(FOTOS_DIR, 'hero');
  try {
    fs.readdirSync(heroDir)
      .filter(f => f !== req.file.filename)
      .forEach(f => fs.unlinkSync(path.join(heroDir, f)));
  } catch {}
  const url    = `/fotos/hero/${req.file.filename}`;
  const config = readJSON(CONFIG_FILE, {});
  config.heroPhoto = url;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true, url });
});

// ── LOOP ──
app.post('/api/admin/audio/loop', requireAuth, uploadLoop.single('song'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ ok: true, url: `/audio/${req.file.filename}` });
});

app.delete('/api/admin/audio/loop/:filename', requireAuth, (req, res) => {
  const name = path.basename(req.params.filename);
  // Solo borrar si tiene prefijo loop- (no tocar fondo2-6 originales)
  if (!name.startsWith('loop-')) return res.status(400).json({ error: 'No se puede borrar ese archivo' });
  const fp = path.join(AUDIO_DIR, name);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── CANCIÓN ANIMAL ──
app.post('/api/admin/audio/:animal', requireAuth, (req, res, next) => {
  if (!ANIMALS.includes(req.params.animal)) return res.status(400).json({ error: 'Animal inválido' });
  next();
}, uploadAnimalSong.single('song'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ ok: true, url: `/audio/${req.file.filename}` });
});

// ── ROX ──
app.post('/api/admin/rox/:slot', requireAuth, (req, res, next) => {
  if (parseInt(req.params.slot) < 1 || parseInt(req.params.slot) > 10)
    return res.status(400).json({ error: 'Slot inválido (1–10)' });
  next();
}, uploadRox.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  const slot   = parseInt(req.params.slot, 10);
  const url    = `/fotos/rox/${req.file.filename}`;
  const config = readJSON(CONFIG_FILE, {});
  if (!config.rox) config.rox = { slots: Array(10).fill(null) };
  config.rox.slots[slot - 1] = url;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true, url });
});

app.delete('/api/admin/rox/:slot', requireAuth, (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (slot < 1 || slot > 10) return res.status(400).json({ error: 'Slot inválido' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config.rox) config.rox = { slots: Array(10).fill(null) };
  const oldUrl = config.rox.slots[slot - 1];
  if (oldUrl) {
    try { fs.unlinkSync(path.join(PUBLIC_DIR, oldUrl)); } catch {}
  }
  config.rox.slots[slot - 1] = null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── RUTA ADMIN HTML ──
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// ──────────────────────────────────────────────────────────────
//  INICIO
// ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🐾  El Arca de Rox  →  http://localhost:${PORT}`);
  console.log(`🔐  Admin           →  http://localhost:${PORT}/admin\n`);
});
