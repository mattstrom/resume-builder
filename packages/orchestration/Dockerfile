# Must use a glibc-based image — onnxruntime-node (@mastra/fastembed) ships glibc-linked
# binaries that fail with __getauxval not found on Alpine musl libc.

# Stage 1: All dependencies (dev + prod) — native modules compiled here
FROM node:24.8.0-bookworm-slim AS deps

WORKDIR /app

# node-gyp (needed by onnxruntime-node, utf-8-validate, duckdb) requires python3 + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json nx.json tsconfig.json ./
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/entities/package.json packages/entities/

# Remove unused workspaces so npm ci doesn't require their package.json files
RUN node --eval "const fs=require('fs'); \
  const p=JSON.parse(fs.readFileSync('package.json','utf8')); \
  p.workspaces=p.workspaces.filter(w=>['packages/orchestration','packages/entities'].includes(w)); \
  fs.writeFileSync('package.json',JSON.stringify(p));"

RUN npm ci

# Stage 2: Build
FROM deps AS build

WORKDIR /app

COPY packages/entities packages/entities
COPY packages/orchestration packages/orchestration

ENV PATH="/app/node_modules/.bin:${PATH}"

# Compile entities so dist/ is present when mastra build reads it
RUN npm run build --workspace=packages/entities

WORKDIR /app/packages/orchestration

RUN npm run build

# Stage 3: Prune devDependencies — reuses the compiled native modules from deps,
# no re-install needed
FROM deps AS prod-deps

RUN npm prune --omit=dev

# Stage 4: Runtime
FROM node:24.8.0-bookworm-slim

WORKDIR /app

# Production node_modules (native .node files already compiled, devDeps stripped)
COPY --from=prod-deps /app/node_modules ./node_modules

# Built Mastra server
COPY --from=build /app/packages/orchestration/.mastra/output ./packages/orchestration/.mastra/output

# entities dist — satisfies the workspace symlink node_modules/@resume-builder/entities -> packages/entities
COPY --from=build /app/packages/entities/dist ./packages/entities/dist
COPY --from=build /app/packages/entities/package.json ./packages/entities/package.json

WORKDIR /app/packages/orchestration

EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]
