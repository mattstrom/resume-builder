# Resume Builder

A full-stack resume builder application built as an Nx monorepo.

## Architecture

| Package                                          | Description                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| [`@resume-builder/web`](packages/resume-builder) | React frontend with Monaco editor                                |
| [`@resume-builder/backend`](packages/backend)    | NestJS backend with GraphQL, MongoDB, and MCP server integration |
| [`@resume-builder/entities`](packages/entities)  | Shared data models and Zod validation schemas                    |

## Tech Stack

- **Frontend**: React 19, ShadCN/UI, Monaco Editor, TanStack Router, MobX, Tailwind CSS
- **Backend**: NestJS, GraphQL (Apollo), MongoDB (Typegoose), Model Context Protocol (MCP)
- **Build**: Nx 22, Vite, TypeScript (strict mode)

## Prerequisites

- Node.js 24.8.0 (see `.nvmrc`)
- npm
- Docker (for MongoDB)

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Start MongoDB

```sh
docker compose up -d
```

### 3. Start the services

```sh
# Backend API (port 3000)
npm run start:dev --workspace=@resume-builder/backend

# Frontend dev server
nx serve @resume-builder/web
```

## Development

### Common Commands

```sh
# Run a target across all projects
nx run-many -t <target>

# Run a target on affected projects only
nx affected -t <target>

# Format code
npm run format

# Check formatting
npm run format:check
```

### Code Style

- Prettier: single quotes, 80 char width, 2-space indentation
- TypeScript strict mode with no unused locals/parameters
- ESLint via Nx

## License

Private
