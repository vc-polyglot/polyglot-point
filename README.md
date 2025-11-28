# Polyglot Point - AI Language Learning Platform

Una aplicación de aprendizaje de idiomas que permite practicar conversaciones con Clara, una IA especializada en corrección y enseñanza de idiomas en tiempo real.

## 🌟 Características

- **6 idiomas soportados**: Español, Inglés, Francés, Italiano, Alemán, Portugués
- **IA conversacional**: Clara responde y corrige en tiempo real
- **Text-to-Speech**: Audio natural con Google Cloud TTS
- **Corrección inteligente**: Solo corrige errores reales
- **Memoria conversacional**: Mantiene contexto de 30 turnos
- **Interfaz responsive**: Diseño moderno tipo WhatsApp

## 🚀 Instalación y Configuración pa que jale chido

### Prerrequisitos
- Node.js 18 o superior
- PostgreSQL database (Neon, Supabase, etc.)
- Cuentas en: OpenAI, Google Cloud

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/polyglot-point.git
cd polyglot-point
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crea un archivo `.env` con:
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI
POLYGLOT_OPENAI_KEY
=sk-your-openai-api-key

# Google Cloud TTS
GOOGLE_APPLICATION_CREDENTIALS=base64-encoded-service-account-json
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id

# Session (opcional)
SESSION_SECRET=your-random-secret-key
```

4. **Migrar base de datos**
```bash
npm run db:push
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

## 📚 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm start` - Ejecutar en producción
- `npm run db:push` - Migrar esquemas de base de datos
- `npm run check` - Verificar tipos TypeScript

## 🔧 Variables de Entorno

### Obligatorias
- `DATABASE_URL` - Conexión a PostgreSQL
- `POLYGLOT_OPENAI_KEY
` - Clave de OpenAI para Clara
- `GOOGLE_APPLICATION_CREDENTIALS` - Credenciales de Google Cloud (base64)
- `GOOGLE_CLOUD_PROJECT_ID` - ID del proyecto de Google Cloud

### Opcionales
- `SESSION_SECRET` - Secreto para sesiones (se genera automáticamente)
- `NODE_ENV` - Entorno (development/production)

## 🌐 Deploy en Vercel

1. **Subir a GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Conectar con Vercel**
- Ve a [vercel.com](https://vercel.com)
- Importa tu repositorio de GitHub
- Configura las variables de entorno
- Deploy automático

### Configuración Vercel
- Build Command: `npm run vercel-build`
- Output Directory: `dist`
- Install Command: `npm install`

## 🗂️ Estructura del Proyecto

```
polyglot-point/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Tipos y esquemas compartidos
├── public/           # Assets estáticos
├── vercel.json       # Configuración Vercel
└── package.json      # Dependencies y scripts
```

## 🔒 Configuración de APIs

### OpenAI
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea cuenta y obtén API key
3. Agrega créditos a tu cuenta

### Google Cloud TTS
1. Crea proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita Text-to-Speech API
3. Crea service account y descarga JSON
4. Convierte JSON a base64:
```bash
base64 -i service-account.json
```

### Base de Datos
**Opción recomendada: Neon**
1. Ve a [neon.tech](https://neon.tech)
2. Crea cuenta gratuita
3. Crea nueva base de datos
4. Copia el `DATABASE_URL`

## 🐛 Troubleshooting

### Error: "Module not found"
- Ejecuta `npm install`
- Verifica que estés en el directorio correcto

### Error: "Database connection failed"
- Verifica `DATABASE_URL` en `.env`
- Ejecuta `npm run db:push`

### Error: "OpenAI API limit exceeded"
- Verifica límites en tu cuenta OpenAI
- Agrega créditos si es necesario

### Error: "Google TTS authentication failed"
- Verifica que `GOOGLE_APPLICATION_CREDENTIALS` esté en base64
- Verifica que Text-to-Speech API esté habilitada

## 📞 Soporte

Si encuentras problemas:
1. Revisa la documentación de las APIs utilizadas
2. Verifica que todas las variables de entorno estén configuradas
3. Consulta los logs para errores específicos

## 📄 Licencia

MIT License - Libre para uso personal y comercial.