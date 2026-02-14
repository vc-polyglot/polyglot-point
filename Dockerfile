FROM node:20
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.28.2 --activate
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @platform/polyglot-point build
EXPOSE 8080
CMD ["node", "packages/polyglot-point/backend/dist/index.js"]
