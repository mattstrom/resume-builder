# Stage 1: Base image with pnpm
FROM node:24.8.0-alpine AS base

ARG PNPM_VERSION=12.6.0
RUN npm install --global --no-audit --no-fund pnpm@${PNPM_VERSION}

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.json ./

# Copy the package.json files of web and its workspace dependencies
COPY packages/entities/package.json packages/entities/
COPY packages/resume-builder/package.json packages/resume-builder/

# Install web, entities, and the root project (for nx and the Vite plugins),
# including dev dependencies for the build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store \
      --filter @mattstrom/resume-builder \
      --filter '@resume-builder/web...'

# Stage 3: Dev target (for docker-compose with volume mounts)
FROM deps AS dev

WORKDIR /app/packages/resume-builder

EXPOSE 5173

# Expects src/, dist/ as volume mounts from host
CMD ["pnpm", "exec", "vite", "--host"]

# Stage 4: Build
FROM deps AS build

WORKDIR /app

# Copy source for entities and web
COPY packages/entities packages/entities
COPY packages/resume-builder packages/resume-builder

# prisma.config.ts requires DATABASE_URL, but generating clients never
# connects to it. This stage is never pushed, so the placeholder stays local.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# The entities build needs the generated zod schemas first
RUN pnpm --filter @resume-builder/entities run prisma:generate

# Set config environment for build-time injection
ENV NODE_CONFIG_DIR=/app/packages/resume-builder/config
ARG NODE_CONFIG_ENV=production
ENV NODE_CONFIG_ENV=${NODE_CONFIG_ENV}

# Build web (Nx handles building dependencies like entities automatically)
RUN pnpm exec nx build @resume-builder/web

# Stage 5: Serve with nginx
FROM nginx:alpine

COPY --from=build /app/packages/resume-builder/dist /usr/share/nginx/html

# Support client-side routing
RUN printf 'server {\n\
    listen 5173;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
