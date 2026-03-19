# Stage 1: Install dependencies
FROM node:24.8.0-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy package.json files for web and its local dependency (entities)
COPY packages/resume-builder/package.json packages/resume-builder/
COPY packages/entities/package.json packages/entities/

# Install dependencies for both workspaces
RUN npm ci --workspace=packages/resume-builder --workspace=packages/entities

# Stage 2: Runtime
FROM node:24.8.0-alpine

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/resume-builder/node_modules ./packages/resume-builder/node_modules
COPY --from=deps /app/packages/entities/node_modules ./packages/entities/node_modules

# Source and dist are expected to be mounted as volumes:
#   -v ./packages/resume-builder/src:/app/packages/resume-builder/src
#   -v ./packages/resume-builder/dist:/app/packages/resume-builder/dist
#   -v ./packages/entities/dist:/app/packages/entities/dist
#   -v ./packages/entities/schemas:/app/packages/entities/schemas

# Copy entities package.json for module resolution
COPY packages/entities/package.json packages/entities/

# Copy config files needed at runtime
COPY packages/resume-builder/package.json packages/resume-builder/
COPY packages/resume-builder/vite.config.ts packages/resume-builder/
COPY packages/resume-builder/tsconfig*.json packages/resume-builder/
COPY packages/resume-builder/tailwind.config.* packages/resume-builder/
COPY packages/resume-builder/postcss.config.* packages/resume-builder/
COPY packages/resume-builder/index.html packages/resume-builder/

WORKDIR /app/packages/resume-builder

EXPOSE 5173

CMD ["npx", "vite", "--host"]