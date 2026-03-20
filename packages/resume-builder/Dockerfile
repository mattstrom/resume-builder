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

# Copy config files needed for vite
COPY packages/resume-builder/package.json packages/resume-builder/
COPY packages/entities/package.json packages/entities/

WORKDIR /app/packages/resume-builder

EXPOSE 5173

# Expects src/, dist/ as volume mounts from host
CMD ["npx", "vite", "--host"]

# Stage 3: Build
FROM deps AS build

WORKDIR /app

# Copy source for entities and web
COPY packages/entities packages/entities
COPY packages/resume-builder packages/resume-builder

# Set config environment for build-time injection
ENV NODE_CONFIG_DIR=/app/packages/resume-builder/config
ARG NODE_CONFIG_ENV=production
ENV NODE_CONFIG_ENV=${NODE_CONFIG_ENV}

# Build web (Nx handles building dependencies like entities automatically)
RUN npx nx build @resume-builder/web

# Stage 4: Serve with nginx
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
