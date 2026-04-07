FROM node:20

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @platform/lexipop-decision run build

EXPOSE 3000

CMD ["node", "packages/lexipop-decision/dist/index.cjs"]