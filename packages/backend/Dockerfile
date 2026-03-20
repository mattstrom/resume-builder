# Stage 1: Install dependencies
FROM node:24.8.0-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json nx.json tsconfig.json ./

# Copy all workspace package.json files (npm ci needs them all)
COPY packages/backend/package.json packages/backend/
COPY packages/entities/package.json packages/entities/
COPY packages/resume-builder/package.json packages/resume-builder/

# Install all dependencies (including dev for build)
# Root install needed so nx and other root devDependencies are available
RUN npm ci

# Stage 2: Dev target (for docker-compose with volume mounts)
FROM deps AS dev

WORKDIR /app

# Copy config and package files needed at runtime
COPY packages/backend/config packages/backend/config
COPY packages/backend/package.json packages/backend/
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/entities/package.json packages/entities/

WORKDIR /app/packages/backend

EXPOSE 3000

# Expects src/, dist/, config/ as volume mounts from host
CMD ["node", "dist/src/main"]

# Stage 3: Build
FROM deps AS build

WORKDIR /app

# Copy source for entities and backend
COPY packages/entities packages/entities
COPY packages/backend packages/backend

# Build backend (Nx automatically builds entities dependency first)
RUN npx nx build @resume-builder/backend

# Stage 4: Production dependencies
FROM node:24.8.0-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/entities/package.json packages/entities/

RUN npm ci --workspace=packages/backend --workspace=packages/entities --omit=dev

# Stage 5: Production runtime
FROM node:24.8.0-alpine

WORKDIR /app

# Copy production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=prod-deps /app/packages/entities/node_modules ./packages/entities/node_modules

# Copy built output
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/entities/dist ./packages/entities/dist

# Copy config and package files needed at runtime
COPY packages/backend/package.json packages/backend/
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/backend/config packages/backend/config
COPY packages/entities/package.json packages/entities/

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["node", "dist/src/main"]
