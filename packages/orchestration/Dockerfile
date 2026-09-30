# Must use a glibc-based image — onnxruntime-node (@mastra/fastembed) ships glibc-linked
# binaries that fail with __getauxval not found on Alpine musl libc.

# Stage 1: Base image with pnpm and native build tools
FROM node:24.8.0-bookworm-slim AS base

# node-gyp (needed by onnxruntime-node, utf-8-validate, duckdb) requires python3 + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ARG PNPM_VERSION=12.6.0
RUN npm install --global --no-audit --no-fund pnpm@${PNPM_VERSION}

WORKDIR /app

# Stage 2: All dependencies (dev + prod) — native modules compiled here
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/entities/package.json packages/entities/

# Install only orchestration and its workspace dependencies
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store \
      --filter 'orchestration...'

# Stage 3: Build
FROM deps AS build

WORKDIR /app

COPY packages/entities packages/entities
COPY packages/orchestration packages/orchestration

# prisma.config.ts requires DATABASE_URL, but generating clients never
# connects to it. This stage is never pushed, so the placeholder stays local.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# The entities build needs the generated zod schemas first
RUN pnpm --filter @resume-builder/entities run prisma:generate

# Compile entities so dist/ is present when mastra build reads it
RUN pnpm --filter @resume-builder/entities run build

# mastra build installs the bundle's external dependencies into
# .mastra/output with pnpm, using the allowBuilds from pnpm-workspace.yaml
RUN pnpm --filter orchestration run build

# Stage 4: Production dependencies
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/entities/package.json packages/entities/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store \
      --filter 'orchestration...'

# Stage 5: Runtime
FROM node:24.8.0-bookworm-slim

WORKDIR /app

# Production node_modules (devDeps stripped). The package-level node_modules
# hold symlinks into the root node_modules/.pnpm store, so all are needed.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/orchestration/node_modules ./packages/orchestration/node_modules
COPY --from=prod-deps /app/packages/entities/node_modules ./packages/entities/node_modules

# Built Mastra server
COPY --from=build /app/packages/orchestration/.mastra/output ./packages/orchestration/.mastra/output

# entities dist — satisfies the workspace symlink packages/orchestration/node_modules/@resume-builder/entities -> packages/entities
COPY --from=build /app/packages/entities/dist ./packages/entities/dist
COPY --from=build /app/packages/entities/package.json ./packages/entities/package.json

WORKDIR /app/packages/orchestration

EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]
