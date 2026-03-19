# Stage 1: Install dependencies
FROM node:24.8.0-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy package.json files for backend and its local dependency (entities)
COPY packages/backend/package.json packages/backend/
COPY packages/entities/package.json packages/entities/

# Install production dependencies only
RUN npm ci --workspace=packages/backend --workspace=packages/entities --omit=dev

# Stage 2: Runtime
FROM node:24.8.0-alpine

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/entities/node_modules ./packages/entities/node_modules

# Source and dist are expected to be mounted as volumes:
#   -v ./packages/backend/src:/app/packages/backend/src
#   -v ./packages/backend/dist:/app/packages/backend/dist
#   -v ./packages/backend/config:/app/packages/backend/config
#   -v ./packages/entities/dist:/app/packages/entities/dist

# Copy config files needed at runtime
COPY packages/backend/package.json packages/backend/
COPY packages/backend/nest-cli.json packages/backend/
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/backend/tsconfig.build.json packages/backend/
COPY packages/entities/package.json packages/entities/

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["node", "dist/src/main"]
