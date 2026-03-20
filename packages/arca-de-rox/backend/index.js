// ══════════════════════════════════════════════════════════════
//  El Arca de Rox — backend/index.js
//  Fotos → Cloudinary (nuevas) + /fotos/ local (legado del repo)
//  JSON  → Railway Volume (/data) o ../data en local
// ══════════════════════════════════════════════════════════════

const express    = require('express');
const session    = require('express-session');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const cloudinary = require('cloudinary').v2;

const app  = express();
const PORT = process.env.PORT || 3005;

// ──────────────────────────────────────────────────────────────
//  CLOUDINARY
// ──────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvrxzdabu',
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    }).end(buffer);
  });
}

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
const FOTOS_DIR      = path.join(PUBLIC_DIR, 'fotos');   // fotos legado del repo
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

if (!fs.existsSync(STORIES_FILE))
  writeJSON(STORIES_FILE, { aquiles: '', copito: '', elvis: '' });

if (!fs.existsSync(CONFIG_FILE))
  writeJSON(CONFIG_FILE, {
    heroPhoto: null, heroPublicId: null,
    aquiles:  { mainPhoto: null, photos: [] },
    copito:   { mainPhoto: null, photos: [] },
    elvis:    { mainPhoto: null, photos: [] },
    rox:      { slots: Array(10).fill(null) },
    loopSongs: [], animalSongs: {},
  });

// Migrar config viejo al nuevo formato si hace falta
function migrateConfig() {
  const c = readJSON(CONFIG_FILE, {});
  let changed = false;
  ANIMALS.forEach(a => {
    if (!c[a]) { c[a] = { mainPhoto: null, photos: [] }; changed = true; }
    if (!Array.isArray(c[a].photos)) { c[a].photos = []; changed = true; }
  });
  if (!Array.isArray(c.loopSongs))   { c.loopSongs = [];   changed = true; }
  if (!c.animalSongs)                { c.animalSongs = {}; changed = true; }
  if (!c.rox)                        { c.rox = { slots: Array(10).fill(null) }; changed = true; }
  if (changed) writeJSON(CONFIG_FILE, c);
}
migrateConfig();

// ──────────────────────────────────────────────────────────────
//  MULTER — memoria, sube a Cloudinary
// ──────────────────────────────────────────────────────────────
const memStorage = multer.memoryStorage();
const uploadImg  = multer({ storage: memStorage, limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, EXT_IMG.includes(path.extname(file.originalname).toLowerCase())) });
const uploadAud  = multer({ storage: memStorage, limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, EXT_AUD.includes(path.extname(file.originalname).toLowerCase())) });

// ──────────────────────────────────────────────────────────────
//  HELPERS — fotos legado (las que están en el repo /fotos/)
// ──────────────────────────────────────────────────────────────
function getLegacyPhotos(animal) {
  // Devuelve array de { url, publicId: null } para fotos del repo
  const dir = path.join(FOTOS_DIR, animal);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => EXT_IMG.includes(path.extname(f).toLowerCase()))
    .map(f => ({ url: `/fotos/${animal}/${f}`, publicId: null, legacy: true, filename: f }));
}

function getAllPhotos(animal) {
  // Combina legado + Cloudinary
  const config  = readJSON(CONFIG_FILE, {});
  const cloud   = (config[animal] && config[animal].photos) || [];
  const legacy  = getLegacyPhotos(animal);
  // Evitar duplicar si alguna foto del repo ya fue subida a Cloudinary
  const cloudUrls = new Set(cloud.map(p => p.url));
  const legacyFiltered = legacy.filter(p => !cloudUrls.has(p.url));
  return [...legacyFiltered, ...cloud];
}

// ──────────────────────────────────────────────────────────────
//  MIDDLEWARE
// ──────────────────────────────────────────────────────────────
app.use((req, res, next) => { res.removeHeader('Accept-Ranges'); next(); });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
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
  if (req.body.password === ADMIN_PASSWORD) { req.session.isAdmin = true; return res.json({ ok: true }); }
  res.status(401).json({ error: 'Contraseña incorrecta' });
});
app.post('/api/admin/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get('/api/admin/me', (req, res) => { res.json({ isAdmin: !!(req.session && req.session.isAdmin) }); });

// ──────────────────────────────────────────────────────────────
//  API PÚBLICA
// ──────────────────────────────────────────────────────────────

// /api/fotos — compatible con index.html existente
app.get('/api/fotos', (req, res) => {
  let fotos = [];
  ANIMALS.forEach(a => { getAllPhotos(a).forEach(p => fotos.push(p.url)); });
  // Recuerdos — siempre del repo
  const recDir = path.join(FOTOS_DIR, 'recuerdos');
  if (fs.existsSync(recDir)) {
    fs.readdirSync(recDir)
      .filter(f => EXT_IMG.includes(path.extname(f).toLowerCase()))
      .forEach(f => fotos.push(`/fotos/recuerdos/${f}`));
  }
  res.json({ fotos, total: fotos.length });
});

// /api/fotos/:animal — para el admin (devuelve objetos con url + publicId)
app.get('/api/fotos/:animal', (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  res.json(getAllPhotos(animal));
});

app.get('/api/stories', (req, res) => res.json(readJSON(STORIES_FILE, {})));
app.get('/api/config',  (req, res) => res.json(readJSON(CONFIG_FILE,  {})));

app.get('/api/audio/loop', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  res.json(config.loopSongs || []);
});

app.get('/api/audio/canciones', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  // Primero busca en config (Cloudinary), luego fallback a archivos del repo
  const result = {};
  ANIMALS.forEach(a => {
    if (config.animalSongs && config.animalSongs[a]) {
      result[a] = config.animalSongs[a];
    } else {
      // Fallback: buscar en /audio/<animal>.mp3
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
app.post('/api/admin/fotos/:animal', requireAuth, uploadImg.single('photo'), async (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `arca-de-rox/${animal}`, resource_type: 'image',
    });
    const config = readJSON(CONFIG_FILE, {});
    if (!config[animal]) config[animal] = { mainPhoto: null, photos: [] };
    if (!Array.isArray(config[animal].photos)) config[animal].photos = [];
    config[animal].photos.push({ url: result.secure_url, publicId: result.public_id });
    writeJSON(CONFIG_FILE, config);
    res.json({ ok: true, url: result.secure_url, publicId: result.public_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/fotos/:animal', requireAuth, async (req, res) => {
  const { animal } = req.params;
  const { publicId, filename } = req.body;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });

  if (publicId) {
    // Foto de Cloudinary
    await deleteFromCloudinary(publicId);
    const config = readJSON(CONFIG_FILE, {});
    if (config[animal] && config[animal].photos) {
      config[animal].photos = config[animal].photos.filter(p => p.publicId !== publicId);
      if (config[animal].mainPhoto === publicId) config[animal].mainPhoto = null;
    }
    writeJSON(CONFIG_FILE, config);
  } else if (filename) {
    // Foto legado del repo
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
  // Acepta publicId (Cloudinary) o filename (legado)
  config[animal].mainPhoto = req.body.publicId || req.body.filename || null;
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── HERO ──
app.post('/api/admin/hero', requireAuth, uploadImg.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  try {
    const config = readJSON(CONFIG_FILE, {});
    if (config.heroPublicId) await deleteFromCloudinary(config.heroPublicId);
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'arca-de-rox/hero', resource_type: 'image',
    });
    config.heroPhoto    = result.secure_url;
    config.heroPublicId = result.public_id;
    writeJSON(CONFIG_FILE, config);
    res.json({ ok: true, url: result.secure_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LOOP ──
app.post('/api/admin/audio/loop', requireAuth, uploadAud.single('song'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'arca-de-rox/loop', resource_type: 'video',
      public_id: path.parse(req.file.originalname).name + '-' + Date.now(),
    });
    const config = readJSON(CONFIG_FILE, {});
    if (!config.loopSongs) config.loopSongs = [];
    config.loopSongs.push({ url: result.secure_url, publicId: result.public_id, name: req.file.originalname });
    writeJSON(CONFIG_FILE, config);
    res.json({ ok: true, url: result.secure_url, publicId: result.public_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/audio/loop', requireAuth, async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: 'Sin publicId' });
  await deleteFromCloudinary(publicId, 'video');
  const config = readJSON(CONFIG_FILE, {});
  config.loopSongs = (config.loopSongs || []).filter(s => s.publicId !== publicId);
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

// ── CANCIÓN ANIMAL ──
app.post('/api/admin/audio/:animal', requireAuth, uploadAud.single('song'), async (req, res) => {
  const { animal } = req.params;
  if (!ANIMALS.includes(animal)) return res.status(400).json({ error: 'Animal inválido' });
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  try {
    const config = readJSON(CONFIG_FILE, {});
    if (config.animalSongs && config.animalSongs[animal] && config.animalSongs[animal].publicId)
      await deleteFromCloudinary(config.animalSongs[animal].publicId, 'video');
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'arca-de-rox/canciones', resource_type: 'video',
      public_id: animal + '-' + Date.now(),
    });
    if (!config.animalSongs) config.animalSongs = {};
    config.animalSongs[animal] = { url: result.secure_url, publicId: result.public_id };
    writeJSON(CONFIG_FILE, config);
    res.json({ ok: true, url: result.secure_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ROX ──
app.post('/api/admin/rox/:slot', requireAuth, uploadImg.single('photo'), async (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (slot < 1 || slot > 10) return res.status(400).json({ error: 'Slot inválido' });
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  try {
    const config = readJSON(CONFIG_FILE, {});
    if (!config.rox) config.rox = { slots: Array(10).fill(null) };
    if (!Array.isArray(config.rox.slots)) config.rox.slots = Array(10).fill(null);
    const old = config.rox.slots[slot - 1];
    if (old && old.publicId) await deleteFromCloudinary(old.publicId);
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'arca-de-rox/rox', resource_type: 'image',
    });
    config.rox.slots[slot - 1] = { url: result.secure_url, publicId: result.public_id };
    writeJSON(CONFIG_FILE, config);
    res.json({ ok: true, url: result.secure_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ──────────────────────────────────────────────────────────────
//  INICIO
// ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🐾  El Arca de Rox  →  http://localhost:${PORT}`);
  console.log(`🔐  Admin           →  http://localhost:${PORT}/admin`);
  console.log(`📁  Datos           →  ${DATA_DIR}\n`);
});
