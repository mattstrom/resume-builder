# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a resume builder application with real-time collaborative editing
capabilities, organized as an Nx monorepo.

### Architecture

The project consists of multiple packages working together:

- **@resume-builder/web** (`packages/resume-builder`) - Main React
  frontend application with ShadCN, Monaco editor, and Yjs for real-time
  collaborative editing
- **@resume-builder/backend** (`packages/backend`) - NestJS backend with
  PostgreSQL (Prisma), MCP server integration, and REST API endpoints
- **@resume-builder/crdt** (`packages/crdt`) - Hocuspocus CRDT server for
  real-time collaborative document synchronization
- **@resume-builder/entities** (`packages/entities`) - Shared data models and
  type definitions using Typegoose and Zod validation
- **CLI** (`packages/cli`) - Command-line tools (placeholder)

### Key Technologies

- **Frontend**: React 19, ShadCN, Monaco Editor, Yjs for CRDT
- **Backend**: NestJS, PostgreSQL with Prisma, Model Context Protocol (MCP)
- **CRDT Server**: Hocuspocus for collaborative editing
- **Build System**: Nx monorepo, Vite/Rolldown
- **Validation**: Zod schemas

## Commands

### Workspace Commands

- `nx run <project>:<target>` - Run any project target through Nx
- `nx run-many -t <target>` - Run a target across multiple projects
- `nx affected -t <target>` - Run a target on affected projects

### Frontend (`@resume-builder/web`)

- `npm run dev` or `nx serve @resume-builder/web` - Start dev server
    - DO NOT start the frontend yourself. I will start it myself.

- `nx build @resume-builder/web` - Build the application
- `nx build @resume-builder/web --config vite.lib.config.ts` - Build as
  library

### Backend (`@resume-builder/backend`)

- `npm run start:dev` - Start backend in watch mode
- `npm run start:prod` - Start backend in production mode

DO NOT start the backend yourself. I will start it myself.

### CRDT Server (`@resume-builder/crdt`)

- `nx start @resume-builder/crdt` - Start Hocuspocus server on port 1234

### CRDT Document Schema Migrations

Tiptap nodes and marks stored in a Yjs document are durable document schema.
When adding, removing, renaming, or changing the required structure/order of
these nodes or marks, add a versioned, idempotent CRDT migration in
`packages/crdt/src/modules/storage/document-migrations.ts`.

- Run migrations server-side when the profile document loads, before it is
  returned to Hocuspocus; never rely on client UI fallbacks to backfill data.
- Record completed migration IDs in the document's `schemaMigrations` Y.Map and
  make the structural transformation safe to run repeatedly.
- Persist a migrated Yjs snapshot immediately through the normal storage path
  so the derived `Profile.narrative` XML mirror stays in sync.
- Add or update migration coverage for legacy documents, already-migrated
  documents, and multiple matching nodes.

## Code Style

Prettier is configured with:

- Single quotes
- 80 character print width
- 2 space indentation

TypeScript is set to strict mode with no unused locals/parameters.

### Resume Editor Controls

- Treat the resume canvas as paper, regardless of the application theme.
- Do not use dark mode styling for controls rendered on or immediately over the
  resume. Resume inputs, inline editors, and floating controls must retain a
  light paper appearance with a white background and dark, readable text.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Prefix commit messages with a type:

- `feat:` - New features
    - Include `BREAKING CHANGE` in the message body if the feature introduces a breaking change
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks (deps, config, etc.)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `docs:` - Documentation changes
- `test:` - Adding or updating tests

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
