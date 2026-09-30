# Stage 1: Base image with pnpm
FROM node:24.8.0-slim AS base

ARG PNPM_VERSION=12.6.0
RUN npm install --global --no-audit --no-fund pnpm@${PNPM_VERSION}

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./

# Copy the package.json files of crdt and its workspace dependencies
COPY packages/crdt/package.json packages/crdt/
COPY packages/entities/package.json packages/entities/

# Install crdt, entities, and the root project (for nx), including dev
# dependencies for the build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store \
      --filter @mattstrom/resume-builder \
      --filter '@resume-builder/crdt...'

# Stage 3: Build
FROM deps AS build

WORKDIR /app

# Copy source for entities and crdt
COPY packages/entities packages/entities
COPY packages/crdt packages/crdt

# prisma.config.ts requires DATABASE_URL, but generating clients never
# connects to it. This stage is never pushed, so the placeholder stays local.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# The entities build needs the generated zod schemas first
RUN pnpm --filter @resume-builder/entities run prisma:generate

# Build crdt (Nx automatically builds entities dependency first)
RUN pnpm exec nx build @resume-builder/crdt

# Stage 4: Production dependencies
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/crdt/package.json packages/crdt/
COPY packages/entities/package.json packages/entities/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store \
      --filter '@resume-builder/crdt...'

# Stage 5: Production runtime
FROM node:24.8.0-slim

WORKDIR /app

# Copy production node_modules. The package-level node_modules hold symlinks
# into the root node_modules/.pnpm store, so all of them are needed.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/crdt/node_modules ./packages/crdt/node_modules
COPY --from=prod-deps /app/packages/entities/node_modules ./packages/entities/node_modules

# Copy built output
COPY --from=build /app/packages/crdt/dist ./packages/crdt/dist
COPY --from=build /app/packages/entities/dist ./packages/entities/dist

# Copy package files needed at runtime
COPY packages/crdt/package.json packages/crdt/
COPY packages/entities/package.json packages/entities/

WORKDIR /app/packages/crdt

EXPOSE 1234

CMD ["node", "dist/main.js"]
