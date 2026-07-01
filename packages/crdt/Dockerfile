# Stage 1: Install dependencies
FROM node:24.8.0-slim AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json nx.json tsconfig.json ./

# Copy all workspace package.json files (npm ci needs them all)
COPY packages/crdt/package.json packages/crdt/
COPY packages/entities/package.json packages/entities/

# Install all dependencies (including dev for build)
# Root install needed so nx and other root devDependencies are available
RUN npm ci

# Stage 2: Build
FROM deps AS build

WORKDIR /app

# Copy source for entities and crdt
COPY packages/entities packages/entities
COPY packages/crdt packages/crdt

# Build crdt (Nx automatically builds entities dependency first)
RUN npx nx build @resume-builder/crdt

# Stage 3: Production dependencies
FROM node:24.8.0-slim AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/crdt/package.json packages/crdt/
COPY packages/entities/package.json packages/entities/

RUN npm ci --workspace=packages/crdt --workspace=packages/entities --omit=dev

# npm may hoist all of crdt/entities' deps into the root node_modules with no
# per-package nesting, depending on whether any versions conflict — ensure
# these directories exist (possibly empty) so the COPY below never fails.
RUN mkdir -p packages/crdt/node_modules packages/entities/node_modules

# Stage 4: Production runtime
FROM node:24.8.0-slim

WORKDIR /app

# Copy production node_modules
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
