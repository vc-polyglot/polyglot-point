# ─────────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Workspace manifests — copy root + all package manifests first
# so Docker cache is invalidated only when deps change
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

COPY packages/core/package.json           ./packages/core/
COPY packages/lexipop-core/package.json   ./packages/lexipop-core/
COPY packages/lexipop-math/package.json   ./packages/lexipop-math/
COPY packages/polyglot-point/package.json ./packages/polyglot-point/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source (only what lexipop-math needs)
COPY packages/core/          ./packages/core/
COPY packages/lexipop-core/  ./packages/lexipop-core/
COPY packages/lexipop-math/  ./packages/lexipop-math/

# Build
WORKDIR /app/packages/lexipop-math
RUN pnpm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

COPY packages/core/package.json           ./packages/core/
COPY packages/lexipop-core/package.json   ./packages/lexipop-core/
COPY packages/lexipop-math/package.json   ./packages/lexipop-math/
COPY packages/polyglot-point/package.json ./packages/polyglot-point/

# Production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled artifacts
COPY --from=builder /app/packages/core/         ./packages/core/
COPY --from=builder /app/packages/lexipop-core/ ./packages/lexipop-core/
COPY --from=builder /app/packages/lexipop-math/dist/          ./packages/lexipop-math/dist/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "packages/lexipop-math/dist/index.cjs"]