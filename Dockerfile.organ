FROM node:20-alpine
RUN apk add --no-cache vips-dev fftw-dev build-base python3
WORKDIR /app
COPY packages/organ-project/package.json ./
RUN npm install
COPY packages/organ-project/backend/index.js ./backend/
COPY packages/organ-project/public/ ./public/
ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002
CMD ["node", "backend/index.js"]