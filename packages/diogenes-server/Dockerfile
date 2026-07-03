FROM node:20-alpine

ENV VITE_API_URL=https://diogenes-server-production.up.railway.app

WORKDIR /app

# Instalar dependencias del servidor
COPY packages/diogenes-server/package*.json ./packages/diogenes-server/
RUN cd packages/diogenes-server && npm install --production

# Instalar dependencias del frontend
COPY packages/diogenes/package*.json ./packages/diogenes/
RUN cd packages/diogenes && npm install

# Copiar código
COPY packages/diogenes-server ./packages/diogenes-server
COPY packages/diogenes ./packages/diogenes

# Build del frontend con la variable
RUN cd packages/diogenes && npm run build

# Instalar tsx globalmente
RUN npm install -g tsx

WORKDIR /app/packages/diogenes-server

EXPOSE 3000

CMD ["tsx", "src/index.ts"]