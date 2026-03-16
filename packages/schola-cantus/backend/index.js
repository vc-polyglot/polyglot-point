const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const bcrypt  = require('bcryptjs');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Helpers de datos ────────────────────────────────────────────────────────

const DATA = path.join(__dirname, '../data');

function readJSON(file) {
  const full = path.join(DATA, file);
  if (!fs.existsSync(full)) return [];
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}

function readConfig() {
  const full = path.join(DATA, 'config.json');
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

// ─── Multer (PDFs) ───────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 días
}));

// ─── Guards ──────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/entrar');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(403).json({ error: 'Acceso denegado' });
}

// ─── Páginas ─────────────────────────────────────────────────────────────────

app.get('/',          (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/cursos',    (req, res) => res.sendFile(path.join(__dirname, '../public/cursos.html')));
app.get('/curso/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/curso.html')));
app.get('/leccion/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/leccion.html')));
app.get('/entrar',      (req, res) => res.sendFile(path.join(__dirname, '../public/entrar.html')));
app.get('/profesores', (req, res) => res.sendFile(path.join(__dirname, '../public/profesores.html')));
app.get('/recursos',   (req, res) => res.sendFile(path.join(__dirname, '../public/recursos.html')));

app.get('/dashboard', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '../public/dashboard.html')));

app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/admin.html')));

// ─── API: Auth ────────────────────────────────────────────────────────────────

// Login alumno
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
  req.session.userId = user.id;
  req.session.userEmail = user.email;
  res.json({ ok: true, redirect: '/dashboard' });
});

// Login admin
app.post('/api/auth/admin', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Registro de alumno
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  const users = readJSON('users.json');
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'El correo ya está registrado' });
  }
  const newUser = {
    id: 'user-' + Date.now(),
    name,
    email,
    password_hash: bcrypt.hashSync(password, 10),
    role: 'student',
    enrollments: [],
    progress: {},
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON('users.json', users);
  req.session.userId = newUser.id;
  req.session.userEmail = newUser.email;
  res.json({ ok: true, redirect: '/dashboard' });
});

// Sesión actual
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, id: user.id, name: user.name, email: user.email });
});

// ─── API: Cursos ──────────────────────────────────────────────────────────────

app.get('/api/courses', (req, res) => {
  const courses = readJSON('courses.json');
  const published = courses
    .filter(c => c.status === 'published')
    .map(({ modules, ...rest }) => ({
      ...rest,
      lessonCount: (modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0),
      moduleCount: (modules || []).length
    }));
  res.json(published);
});

app.get('/api/courses/:id', (req, res) => {
  const courses = readJSON('courses.json');
  const course = courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json(course);
});

// ─── API: Lecciones ───────────────────────────────────────────────────────────

app.get('/api/lessons/:id', (req, res) => {
  const courses = readJSON('courses.json');
  for (const course of courses) {
    for (const mod of (course.modules || [])) {
      const lesson = (mod.lessons || []).find(l => l.id === req.params.id);
      if (lesson) {
        return res.json({
          ...lesson,
          course_id: course.id,
          course_title: course.title,
          module_title: mod.title
        });
      }
    }
  }
  res.status(404).json({ error: 'Lección no encontrada' });
});

// ─── API: Inscripción ─────────────────────────────────────────────────────────

app.post('/api/enroll', requireAuth, (req, res) => {
  const { course_id } = req.body;
  const users = readJSON('users.json');
  const idx = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (!users[idx].enrollments.includes(course_id)) {
    users[idx].enrollments.push(course_id);
    writeJSON('users.json', users);
  }
  res.json({ ok: true });
});

// ─── API: Progreso ────────────────────────────────────────────────────────────

app.post('/api/progress', requireAuth, (req, res) => {
  const { lesson_id } = req.body;
  const users = readJSON('users.json');
  const idx = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });
  users[idx].progress[lesson_id] = {
    completed: true,
    completed_at: new Date().toISOString()
  };
  writeJSON('users.json', users);
  res.json({ ok: true });
});

app.get('/api/progress/:course_id', requireAuth, (req, res) => {
  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const courses = readJSON('courses.json');
  const course = courses.find(c => c.id === req.params.course_id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

  const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
  const completed  = allLessons.filter(l => user.progress[l.id]?.completed).length;
  const total      = allLessons.length;
  const percent    = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({ completed, total, percent, detail: user.progress });
});

// ─── API: Dashboard del alumno ────────────────────────────────────────────────

app.get('/api/dashboard', requireAuth, (req, res) => {
  const users   = readJSON('users.json');
  const courses = readJSON('courses.json');
  const user    = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const enrolled = courses
    .filter(c => user.enrollments.includes(c.id))
    .map(course => {
      const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
      const completed  = allLessons.filter(l => user.progress[l.id]?.completed).length;
      const total      = allLessons.length;
      const percent    = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: course.id,
        title: course.title,
        cover_image: course.cover_image,
        percent,
        completed,
        total
      };
    });

  res.json({ name: user.name, email: user.email, courses: enrolled });
});

// ─── API: Admin ───────────────────────────────────────────────────────────────

// Crear o actualizar curso
app.post('/api/admin/courses', requireAdmin, (req, res) => {
  const courses = readJSON('courses.json');
  const body = req.body;
  const idx = courses.findIndex(c => c.id === body.id);
  if (idx > -1) {
    courses[idx] = { ...courses[idx], ...body };
  } else {
    courses.push({
      id: 'course-' + Date.now(),
      status: 'draft',
      created_at: new Date().toISOString(),
      modules: [],
      ...body
    });
  }
  writeJSON('courses.json', courses);
  res.json({ ok: true });
});

// Eliminar curso
app.delete('/api/admin/courses/:id', requireAdmin, (req, res) => {
  let courses = readJSON('courses.json');
  courses = courses.filter(c => c.id !== req.params.id);
  writeJSON('courses.json', courses);
  res.json({ ok: true });
});

// Subir PDF
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
  res.json({ ok: true, url: '/uploads/' + req.file.filename });
});

// Lista de alumnos
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = readJSON('users.json').map(({ password_hash, ...u }) => u);
  res.json(users);
});

// Estado de admin
app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Cantus Aeternus corriendo en http://localhost:${PORT}`);
});
