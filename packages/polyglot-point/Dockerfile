FROM node:20

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN pnpm build

EXPOSE 8080

CMD ["node", "backend/dist/index.js"]
