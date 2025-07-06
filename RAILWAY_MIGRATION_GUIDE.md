# 🚀 Guía Completa: Migración de Polyglot Point a Railway

## 🎯 Por qué Railway es PERFECTO para tu app:
✅ **Soporta WebSockets** - Tu audio en tiempo real funcionará al 100%  
✅ **Node.js nativo** - Sin adaptaciones necesarias  
✅ **PostgreSQL incluido** - Base de datos integrada  
✅ **Deploy automático** - Conectas GitHub y listo  
✅ **$5/mes** - Muy económico y confiable  

---

## 📋 PASO 1: Preparar archivos localmente

### 1.1 Crear carpeta del proyecto
```bash
mkdir polyglot-point-railway
cd polyglot-point-railway
```

### 1.2 Descargar y extraer
1. Descarga `polyglot-point-vercel-migration.tar.gz` desde Replit
2. Extrae en la carpeta `polyglot-point-railway`

### 1.3 Preparar package.json para Railway
```bash
# Renombrar el package.json optimizado
cp package-vercel.json package.json
```

---

## 📋 PASO 2: Crear cuenta en Railway

### 2.1 Registro
1. Ve a [railway.app](https://railway.app)
2. "Sign up with GitHub" (conecta tu GitHub)
3. Verifica tu email

### 2.2 Verificar plan
- Plan gratuito: $0/mes + $5 en créditos
- Plan Pro: $5/mes (recomendado para producción)

---

## 📋 PASO 3: Subir código a GitHub

### 3.1 Crear repositorio
```bash
# Inicializar Git
git init
git add .
git commit -m "Polyglot Point - AI Language Learning Platform"

# Crear repo en GitHub (ve a github.com/new)
# Nombre: polyglot-point-railway
# Descripción: "AI-powered multilingual conversation platform"
# Público o privado (tu elección)

# Conectar y subir
git remote add origin https://github.com/TU-USUARIO/polyglot-point-railway.git
git branch -M main
git push -u origin main
```

---

## 📋 PASO 4: Deploy en Railway

### 4.1 Crear proyecto
1. En Railway Dashboard: **"New Project"**
2. **"Deploy from GitHub repo"**
3. Selecciona `polyglot-point-railway`
4. Railway detectará automáticamente que es Node.js

### 4.2 Configuración automática
Railway configurará automáticamente:
- ✅ Build Command: `npm run build`
- ✅ Start Command: `npm start`
- ✅ Puerto: Se detecta automáticamente
- ✅ Healthcheck: Automático

---

## 📋 PASO 5: Configurar base de datos PostgreSQL

### 5.1 Agregar PostgreSQL
1. En tu proyecto Railway: **"+ New"**
2. **"Database"** → **"Add PostgreSQL"**
3. Railway creará la base de datos automáticamente

### 5.2 Obtener DATABASE_URL
1. Click en la base de datos PostgreSQL
2. Pestaña **"Connect"**
3. Copia la **"Postgres Connection URL"**

---

## 📋 PASO 6: Variables de entorno

### 6.1 Configurar en Railway
1. Click en tu servicio web
2. Pestaña **"Variables"**
3. Agregar cada variable:

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/database
OPENAI_API_KEY=sk-tu-clave-openai-aqui
GOOGLE_APPLICATION_CREDENTIALS=tu-google-credentials-base64
GOOGLE_CLOUD_PROJECT_ID=tu-google-project-id
NODE_ENV=production
```

### 6.2 ¿Dónde conseguir las claves?

**OPENAI_API_KEY:**
1. Ve a [platform.openai.com](https://platform.openai.com)
2. API Keys → Create new secret key
3. Copia la clave que empiece con `sk-`

**GOOGLE_CLOUD_PROJECT_ID:**
1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. El ID aparece en el dashboard

**GOOGLE_APPLICATION_CREDENTIALS:**
1. Ve a IAM & Admin → Service Accounts
2. Create Service Account
3. Download JSON key
4. Convierte a Base64: `base64 -i archivo.json`

---

## 📋 PASO 7: Deploy y verificación

### 7.1 Primer deploy
Railway empezará el deploy automáticamente. Monitor:
1. Pestaña **"Deployments"**
2. Click en el deploy activo
3. Ver logs en tiempo real

### 7.2 Obtener URL
1. Pestaña **"Settings"**
2. **"Public Networking"**
3. **"Generate Domain"**
4. Tu app estará en: `https://tu-app.up.railway.app`

---

## 📋 PASO 8: Configurar base de datos

### 8.1 Ejecutar migraciones
```bash
# En tu terminal local, con las variables de entorno de Railway:
npm run db:push
```

O directamente en Railway:
1. Pestaña **"Deploy Logs"**
2. Verificar que las tablas se crearon automáticamente

---

## 📋 PASO 9: Testing completo

### 9.1 Verificaciones críticas
✅ **App carga**: Ve a tu URL de Railway  
✅ **Cambio de idioma**: Prueba las 6 pestañas  
✅ **Clara responde**: Escribe un mensaje  
✅ **Audio funciona**: Clara habla correctamente  
✅ **WebSocket conecta**: Chat en tiempo real  
✅ **Base de datos**: Conversaciones se guardan  

### 9.2 Test de funcionalidades
1. **Prueba multiidioma**: Español, inglés, francés, italiano, alemán, portugués
2. **Correcciones**: Clara detecta y explica errores
3. **Memoria**: Conversaciones persisten
4. **Audio TTS**: Clara habla en cada idioma

---

## ⚡ VENTAJAS DE RAILWAY vs VERCEL

| Característica | Railway | Vercel |
|----------------|---------|--------|
| **WebSockets** | ✅ Nativo | ❌ No soporta |
| **Audio en tiempo real** | ✅ Funciona | ❌ Requiere adaptaciones |
| **Node.js backend** | ✅ Completo | ⚠️ Limitado |
| **PostgreSQL** | ✅ Integrado | ⚠️ Externo |
| **Precio** | $5/mes | $0 pero limitado |
| **Setup** | 🟢 Fácil | 🟡 Complejo |

---

## 🔧 COMANDOS ÚTILES RAILWAY

### Monitorear deployment:
```bash
# Instalar Railway CLI (opcional)
npm install -g @railway/cli

# Login
railway login

# Ver logs en vivo
railway logs
```

### Conectar a base de datos:
```bash
# Con Railway CLI
railway connect

# O usar la URL directamente
psql $DATABASE_URL
```

---

## 🆘 TROUBLESHOOTING

### Error: "Port already in use"
**Solución:** Railway maneja puertos automáticamente, no cambies nada.

### Error: "Database connection failed"
**Solución:** 
1. Verifica DATABASE_URL en variables
2. Asegúrate que PostgreSQL esté corriendo en Railway

### Error: "Build failed"
**Solución:**
1. Verifica que `package.json` esté correcto
2. Revisa logs de build en Railway

### Audio no funciona:
**Solución:** Verifica GOOGLE_CLOUD credentials y PROJECT_ID

---

## 📞 SOPORTE

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Comunidad muy activa
- **GitHub Issues**: Para problemas específicos de código

---

## 🎉 RESULTADO FINAL

Después de seguir esta guía tendrás:

✅ **Polyglot Point funcionando 100%** en Railway  
✅ **Audio en tiempo real** con WebSockets  
✅ **Base de datos PostgreSQL** integrada  
✅ **Deploy automático** desde GitHub  
✅ **Clara conversando** en 6 idiomas  
✅ **$5/mes** costo total  

**Tu aplicación estará lista para usuarios reales.**