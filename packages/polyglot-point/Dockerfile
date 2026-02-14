FROM node:20

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

# copiar todo el repo (porque root_dir es packages/polyglot-point)
COPY . .

# subir un nivel virtualmente para simular monorepo root
WORKDIR /app

RUN pnpm install --no-frozen-lockfile

RUN pnpm build

EXPOSE 8080

CMD ["node", "backend/dist/index.js"]
