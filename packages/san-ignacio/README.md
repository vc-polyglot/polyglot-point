# San Ignacio de Loyola — paquete 01

Primera entrega funcional del nuevo sitio institucional.

## Qué incluye

- Express + Node.js 20.
- Frontend institucional público.
- PostgreSQL.
- Login administrativo con `bcrypt`.
- Sesiones persistidas en Redis mediante `connect-redis`.
- Panel de administración protegido.
- Edición de horarios.
- Creación y publicación de mensajes pastorales.
- Avisos extraordinarios.
- Dockerfile compatible con Railway.
- Esquema preparado para multimedia, música y conciertos.

## Qué NO incluye todavía

Se deja deliberadamente para los siguientes paquetes:

- Cloudinary y subida nativa de fotografía/video.
- Panel completo de Música.
- Stripe/Donativos.
- Formulario de contacto/Nodemailer.
- Páginas interiores finales: Nosotros, Espiritualidad jesuita, Párrocos, etc.
- Integración con `@platform/core`.

No se acopló todavía a `@platform/core` porque este paquete debe correr de forma autónoma y no estamos suponiendo una API interna del monorepo sin verla.

---

## 1. Copiar al monorepo desde Descargas

Si descomprimes `san-ignacio-package-01.zip` en Descargas, tendrás una carpeta:

`$HOME\Downloads\san-ignacio-package-01`

Desde PowerShell, situado en la raíz de `polyglot-point`:

```powershell
Copy-Item "$HOME\Downloads\san-ignacio-package-01" ".\services\san-ignacio" -Recurse -Force
code ".\services\san-ignacio"
```

Si el monorepo usa otra carpeta en vez de `services`, cambia únicamente ese tramo.

Si quieres moverla, no copiarla:

```powershell
Move-Item "$HOME\Downloads\san-ignacio-package-01" ".\services\san-ignacio"
code ".\services\san-ignacio"
```

---

## 2. Variables de entorno

```powershell
cd .\services\san-ignacio
Copy-Item .env.example .env
code .env
```

Configura al menos:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

---

## 3. Instalar y preparar DB

```powershell
npm install
npm run db:migrate
npm run db:seed-admin
npm run dev
```

Abrir:

- Sitio: http://localhost:3000
- Panel: http://localhost:3000/admin

---

## 4. Railway

Variables mínimas:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `NODE_ENV=production`
- `TRUST_PROXY=1`

Para una instalación nueva, ejecutar una vez:

```bash
npm run db:migrate
npm run db:seed-admin
```

Después el servicio arranca con:

```bash
npm start
```

El endpoint de salud es:

`GET /health`

---

## Modelo de esta entrega

### Horarios

Se guardan en `schedules`. El panel reemplaza atómicamente la lista activa.

### Mensaje pastoral

Se puede guardar como borrador o publicar. El sitio público muestra el publicado más reciente.

### Avisos

Ya existe API para avisos y el sitio muestra los que se encuentren dentro de su intervalo de vigencia.

### Autenticación

La contraseña nunca se guarda en claro: `seed-admin.js` la convierte a bcrypt.

La cookie de sesión es:

- `httpOnly`
- `sameSite=lax`
- `secure` en producción

La sesión se guarda en Redis, no en memoria del proceso.
