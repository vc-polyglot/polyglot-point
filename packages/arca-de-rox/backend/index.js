// ══════════════════════════════════════════════════════════════
//  El Arca de Rox — backend/index.js
//  Las fotos van directo del navegador a Cloudinary (unsigned).
//  El backend solo guarda URLs en JSON. Sin multer.
// ══════════════════════════════════════════════════════════════

const express    = require('express');
const session    = require('express-session');
const path       = require('path');
const fs         = require('fs');
const cloudinary = require('cloudinary').v2;

const app  = express();
const PORT = process.env.PORT || 3005;

// ──────────────────────────────────────────────────────────────
//  CLOUDINARY (solo para borrar assets desde el servidor)
// ──────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvrxzdabu',
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function deleteFromCloudinary(publicId, resourceType = 'image') {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
}

// ──────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arca2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'rox-super-secreta-2024';
const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '../data');
const PUBLIC_DIR     = path.join(__dirname, '../public');
const FOTOS_DIR      = path.join(PUBLIC_DIR, 'fotos');
const AUDIO_DIR      = path.join(PUBLIC_DIR, 'audio');

fs.mkdirSync(DATA_DIR, { recursive: true });

const ANIMALS = ['aquiles', 'copito', 'elvis'];
const EXT_IMG  = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const EXT_AUD  = ['.mp3', '.ogg', '.wav', '.m4a'];

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

const defaultConfig = {
  heroPhoto: null, heroPublicId: null,
  aquiles:  { mainPhoto: null, photos: [] },
  copito:   { mainPhoto: null, photos: [] },
  elvis:    { mainPhoto: null, photos: [] },
  rox:      { slots: Array(10).fill(null) },
  galeria:  [],   // [{ url, publicId }]
  loopSongs: [], animalSongs: {},
};

if (!fs.existsSync(STORIES_FILE))
  writeJSON(STORIES_FILE, { aquiles: '', copito: '', elvis: '' });
if (!fs.existsSync(CONFIG_FILE))
  writeJSON(CONFIG_FILE, defaultConfig);

// Migrar config viejo
function migrateConfig() {
  const c = readJSON(CONFIG_FILE, {});
  let changed = false;
  ANIMALS.forEach(a => {
    if (!c[a]) { c[a] = { mainPhoto: null, photos: [] }; changed = true; }
    if (!Array.isArray(c[a].photos)) { c[a].photos = []; changed = true; }
  });
  if (!Array.isArray(c.loopSongs))  { c.loopSongs = [];  changed = true; }
  if (!c.animalSongs)               { c.animalSongs = {}; changed = true; }
  if (!c.rox)                       { c.rox = { slots: Array(10).fill(null) }; changed = true; }
  if (!Array.isArray(c.galeria))    { c.galeria = [];    changed = true; }
  if (changed) writeJSON(CONFIG_FILE, c);
}
migrateConfig();

// ──────────────────────────────────────────────────────────────
//  HELPERS — fotos legado del repo
// ──────────────────────────────────────────────────────────────
function getLegacyPhotos(animal) {
  const dir = path.join(FOTOS_DIR, animal);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => EXT_IMG.includes(path.extname(f).toLowerCase()))
    .map(f => ({ url: `/fotos/${animal}/${f}`, publicId: null, legacy: true, filename: f }));
}

function getAllPhotos(animal) {
  const config = readJSON(CONFIG_FILE, {});
  const cloud  = (config[animal] && config[animal].photos) || [];
  const legacy = getLegacyPhotos(animal);
  const cloudUrls = new Set(cloud.map(p => p.url));
  return [...legacy.filter(p => !cloudUrls.has(p.url)), ...cloud];
}

// ──────────────────────────────────────────────────────────────
//  MIDDLEWARE
// ──────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use((req, res, next) => { res.removeHeader('Accept-Ranges'); next(); });
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true, sameSite: 'none', secure: true },
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
app.post('/api/admin/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get('/api/admin/me', (req, res) => { res.json({ isAdmin: !!(req.session && req.session.isAdmin) }); });

// ──────────────────────────────────────────────────────────────
//  API PÚBLICA
// ──────────────────────────────────────────────────────────────

app.get('/api/fotos', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  let fotos = [];
  ANIMALS.forEach(a => getAllPhotos(a).forEach(p => fotos.push(p.url)));
  // Galería propia
  (config.galeria || []).forEach(p => fotos.push(p.url));
  // Recuerdos del repo
  const recDir = path.join(FOTOS_DIR, 'recuerdos');
  if (fs.existsSync(recDir))
    fs.readdirSync(recDir).filter(f => EXT_IMG.includes(path.extname(f).toLowerCase()))
      .forEach(f => fotos.push(`/fotos/recuerdos/${f}`));
  res.json({ fotos, total: fotos.length });
});

app.get('/api/fotos/:animal', (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  res.json(getAllPhotos(animal));
});

app.get('/api/galeria', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  res.json(config.galeria || []);
});

app.get('/api/stories', (req, res) => res.json(readJSON(STORIES_FILE, {})));
app.get('/api/config',  (req, res) => res.json(readJSON(CONFIG_FILE,  {})));

app.get('/api/audio/loop', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  res.json(config.loopSongs || []);
});

app.get('/api/audio/canciones', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  const result = {};
  ANIMALS.forEach(a => {
    if (config.animalSongs && config.animalSongs[a]) {
      result[a] = config.animalSongs[a];
    } else {
      const found = fs.existsSync(AUDIO_DIR)
        ? fs.readdirSync(AUDIO_DIR).find(f => f.startsWith(a + '.') && EXT_AUD.includes(path.extname(f).toLowerCase()))
        : null;
      if (found) result[a] = { url: `/audio/${found}`, publicId: null };
    }
  });
  res.json(result);
});

app.get('/api/rox', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  res.json((config.rox && config.rox.slots) || Array(10).fill(null));
});

// ──────────────────────────────────────────────────────────────
//  API ADMIN — recibe URLs de Cloudinary (ya subidas desde el browser)
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

// ── FOTOS ANIMALES — recibe { url, publicId } ya subidos a Cloudinary ──
app.post('/api/admin/fotos/:animal', requireAuth, (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const { url, publicId } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config[animal]) config[animal] = { mainPhoto: null, photos: [] };
  if (!Array.isArray(config[animal].photos)) config[animal].photos = [];
  config[animal].photos.push({ url, publicId });
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

app.delete('/api/admin/fotos/:animal', requireAuth, async (req, res) => {
  const { animal } = req.params;
  const { publicId, filename } = req.body;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  if (publicId) {
    await deleteFromCloudinary(publicId);
    const config = readJSON(CONFIG_FILE, {});
    if (config[animal] && config[animal].photos)
      config[animal].photos = config[animal].photos.filter(p => p.publicId !== publicId);
    if (config[animal] && config[animal].mainPhoto === publicId) config[animal].mainPhoto = null;
    writeJSON(CONFIG_FILE, config);
  } else if (filename) {
    const fp = path.join(FOTOS_DIR, animal, path.basename(filename));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    const config = readJSON(CONFIG_FILE, {});
    if (config[animal] && config[animal].mainPhoto === filename) {
      config[animal].mainPhoto = null;
      writeJSON(CONFIG_FILE, config);
    }
  }
  res.json({ ok: true });
});

app.put('/api/admin/fotos/:animal/main', requireAuth, (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config[animal]) config[animal] = { mainPhoto: null, photos: [] };
  config[animal].mainPhoto = req.body.publicId || req.body.filename || null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── HERO ──
app.post('/api/admin/hero', requireAuth, async (req, res) => {
  const { url, publicId } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (config.heroPublicId) await deleteFromCloudinary(config.heroPublicId);
  config.heroPhoto    = url;
  config.heroPublicId = publicId || null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true, url });
});

// ── GALERÍA ──
app.post('/api/admin/galeria', requireAuth, (req, res) => {
  const { url, publicId } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (!Array.isArray(config.galeria)) config.galeria = [];
  config.galeria.push({ url, publicId });
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

app.delete('/api/admin/galeria', requireAuth, async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: 'Sin publicId' });
  await deleteFromCloudinary(publicId);
  const config = readJSON(CONFIG_FILE, {});
  config.galeria = (config.galeria || []).filter(p => p.publicId !== publicId);
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── LOOP ──
app.post('/api/admin/audio/loop', requireAuth, (req, res) => {
  const { url, publicId, name } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config.loopSongs) config.loopSongs = [];
  config.loopSongs.push({ url, publicId, name });
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

app.delete('/api/admin/audio/loop', requireAuth, async (req, res) => {
  const { publicId } = req.body;
  await deleteFromCloudinary(publicId, 'video');
  const config = readJSON(CONFIG_FILE, {});
  config.loopSongs = (config.loopSongs || []).filter(s => s.publicId !== publicId);
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── CANCIÓN ANIMAL ──
app.post('/api/admin/audio/:animal', requireAuth, async (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  const { url, publicId } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (config.animalSongs && config.animalSongs[animal] && config.animalSongs[animal].publicId)
    await deleteFromCloudinary(config.animalSongs[animal].publicId, 'video');
  if (!config.animalSongs) config.animalSongs = {};
  config.animalSongs[animal] = { url, publicId };
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── ROX ──
app.post('/api/admin/rox/:slot', requireAuth, async (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (slot < 1 || slot > 10) return res.status(400).json({ error: 'Slot inválido' });
  const { url, publicId } = req.body;
  if (!url) return res.status(400).json({ error: 'Sin URL' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config.rox) config.rox = { slots: Array(10).fill(null) };
  const old = config.rox.slots[slot - 1];
  if (old && old.publicId) await deleteFromCloudinary(old.publicId);
  config.rox.slots[slot - 1] = { url, publicId };
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

app.delete('/api/admin/rox/:slot', requireAuth, async (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (slot < 1 || slot > 10) return res.status(400).json({ error: 'Slot inválido' });
  const config = readJSON(CONFIG_FILE, {});
  if (!config.rox) config.rox = { slots: Array(10).fill(null) };
  const old = config.rox.slots[slot - 1];
  if (old && old.publicId) await deleteFromCloudinary(old.publicId);
  config.rox.slots[slot - 1] = null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

app.listen(PORT, () => {
  console.log(`\n🐾  El Arca de Rox  →  http://localhost:${PORT}`);
  console.log(`🔐  Admin           →  http://localhost:${PORT}/admin`);
  console.log(`📁  Datos           →  ${DATA_DIR}\n`);
});
