#!/bin/bash
# Railway start script

# Instalar dependencias de produccion
npm ci --only=production

# Ejecutar el servidor
# Si usas servidor en server/:
# node server/index.js

# Si tienes build step:
# npm run build
# node dist/server.js

# Usar script definido en package.json
npm start