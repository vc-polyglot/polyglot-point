# Polyglot Point: Write

**Corrector inteligente de texto en 6 idiomas**

Español, English, Français, Italiano, Deutsch, Português

---

## 🎯 ¿Qué es Polyglot Point: Write?

Un corrector de texto impulsado por IA que:
- ✅ Detecta automáticamente el idioma de tu texto
- ✅ Corrige gramática, ortografía y estilo
- ✅ Proporciona explicaciones educativas claras
- ✅ Ofrece consejos personalizados para mejorar
- ✅ Soporta 6 idiomas simultáneamente

---

## 🏗 Arquitectura

### **Stack Tecnológico**

**Frontend:**
- React 18 + TypeScript
- Vite (build)
- Tailwind CSS
- Llamadas REST a backend

**Backend:**
- Node.js + Express + TypeScript
- OpenAI GPT-4 para correcciones
- PostgreSQL (usuarios y límites)
- Redis (caché)

**Infraestructura:**
- Desplegado en Railway
- CI/CD automático

---

## 🚀 Inicio Rápido

### **Desarrollo Local**

\\\ash
# Clonar repositorio
git clone https://github.com/tu-usuario/polyglot-point-railway.git
cd polyglot-point-railway

# Instalar dependencias
npm install

# Variables de entorno (crear .env)
# Ver .env.example para valores necesarios

# Iniciar desarrollo
npm run dev

# Frontend estará en: http://localhost:5173
# Backend estará en: http://localhost:3000
\\\

---

## 📝 API Principal

### **POST /chat**

Corrige un texto y proporciona feedback educativo.

**Request:**
\\\json
{
  "text": "Texto a corregir en cualquier idioma",
  "language": "es",
  "userId": "user_123"
}
\\\

**Parámetros:**
- \	ext\ (string, requerido): Texto a corregir
- \language\ (string, requerido): Idioma de las explicaciones ('es', 'en', 'fr', 'it', 'de', 'pt')
- \userId\ (string, requerido): ID único del usuario

**Response:**
\\\json
{
  "corrected": "Texto corregido en su idioma original",
  "explanations": [
    "Explicación 1 en el idioma solicitado",
    "Explicación 2 en el idioma solicitado"
  ],
  "tips": [
    "Consejo 1 para mejorar",
    "Consejo 2 para mejorar"
  ],
  "language": "es",
  "remainingMessages": 18
}
\\\

---

## 📊 Estado del Proyecto

### **✅ Completado (Fase 1)**
- [x] Decisión estratégica: Solo Write (no Conversation)
- [x] Limpieza de código: Eliminado 70% del código innecesario
- [x] Backend /chat funcional
- [x] Frontend App.tsx optimizado
- [x] Sistema de login/logout
- [x] Contador de mensajes gratis (20/día)
- [x] Modal de upgrade a Premium

### **🚧 En Progreso (Semana 1)**
- [ ] Sistema de 3 capas de idioma (Prioridad #3)
- [ ] Fix encoding UTF-8 (Prioridad #4)
- [ ] Prompt maestro endurecido (Prioridad #5)
- [ ] Testing automatizado básico

### **📅 Próximamente (Semana 2)**
- [ ] Detección automática de idioma en frontend
- [ ] Suite completa de tests
- [ ] Lanzamiento MVP público
- [ ] Product Hunt launch

---

## 💰 Modelo de Negocio

**Freemium:**
- **Gratis:** 20 correcciones/día
- **Premium:** .99/mes - Correcciones ilimitadas

---

## 🎯 Roadmap 2025

### **Enero 2025**
- ✅ MVP Write lanzado
- 🎯 100 usuarios activos
- 🎯 10 usuarios Premium

### **Febrero 2025**
- 🎯 500 usuarios activos
- 🎯 50 usuarios Premium
- 🎯 Blog con tips de escritura

### **Marzo 2025**
- 🎯 1000 usuarios activos
- 🎯 Extensión de Chrome/Edge
- 🎯 API pública para developers

---

## 📄 Licencia

Propietario: Polyglot Point  
© 2025 Todos los derechos reservados

---

## 🤝 Contacto

- **Web:** polyglotpoint.com (próximamente)
- **Email:** contact@polyglotpoint.com
- **Twitter:** @polyglotpoint

---

**Hecho con ❤️ para ayudar a personas a mejorar su escritura multilingüe**
