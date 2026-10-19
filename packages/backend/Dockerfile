# Stage 1: Base image with pnpm
FROM node:24.8.0-slim AS base

ARG PNPM_VERSION=12.6.0
RUN npm install --global --no-audit --no-fund pnpm@${PNPM_VERSION}

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./

# Copy the package.json files of the backend and its workspace dependencies
COPY packages/backend/package.json packages/backend/
COPY packages/entities/package.json packages/entities/
COPY packages/ontologies/package.json packages/ontologies/

# Install the backend, its workspace dependencies, and the root project (for
# nx and the SWC toolchain), including dev dependencies for the build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store \
      --filter @mattstrom/resume-builder \
      --filter '@resume-builder/backend...'

# Stage 3: Dev target (for docker-compose with volume mounts)
FROM deps AS dev

WORKDIR /app

# Copy config files needed at runtime
COPY packages/backend/config packages/backend/config
COPY packages/backend/tsconfig.json packages/backend/

WORKDIR /app/packages/backend

EXPOSE 3000

# Expects src/, dist/, config/ as volume mounts from host
CMD ["node", "dist/main"]

# Stage 4: Build
FROM deps AS build

WORKDIR /app

# Copy source for backend and its workspace dependencies
COPY packages/entities packages/entities
COPY packages/ontologies packages/ontologies
COPY packages/backend packages/backend

# prisma.config.ts requires DATABASE_URL, but generating clients never
# connects to it. This stage is never pushed, so the placeholder stays local.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# The entities build needs the generated zod schemas first
RUN pnpm --filter @resume-builder/entities run prisma:generate

# Build backend (Nx automatically builds workspace dependencies first)
RUN pnpm exec nx build @resume-builder/backend

# Stage 5: Production dependencies
FROM base AS prod-deps

# The production runtime installs Debian Chromium instead of using this cache.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/entities/package.json packages/entities/
COPY packages/ontologies/package.json packages/ontologies/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store \
      --filter '@resume-builder/backend...'

# Stage 6: Browser runtime (also buildable on its own for PDF smoke checks)
FROM node:24.8.0-slim AS browser-runtime

# Installing Chromium also installs its shared libraries, on amd64 and arm64.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      chromium \
      dumb-init \
      fonts-liberation \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# This container runs without the extra kernel capabilities Chrome's sandbox
# requires. Keep this opt-out container-specific; local launches stay sandboxed.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_DISABLE_SANDBOX=true

USER node

ENTRYPOINT ["dumb-init", "--"]

# Stage 7: Production runtime
FROM browser-runtime

WORKDIR /app

# Copy production node_modules. The package-level node_modules hold symlinks
# into the root node_modules/.pnpm store, so all of them are needed.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=prod-deps /app/packages/entities/node_modules ./packages/entities/node_modules
COPY --from=prod-deps /app/packages/ontologies/node_modules ./packages/ontologies/node_modules

# Copy built output
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/entities/dist ./packages/entities/dist
COPY --from=build /app/packages/ontologies/dist ./packages/ontologies/dist

# Copy config and package files needed at runtime
COPY packages/backend/package.json packages/backend/
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/backend/config packages/backend/config
COPY packages/entities/package.json packages/entities/
COPY packages/ontologies/package.json packages/ontologies/

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["node", "dist/main"]
