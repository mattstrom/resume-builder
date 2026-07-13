# crdt-restore-cli

Standalone CLI for inspecting and restoring Yjs (CRDT) documents, extracted
from `packages/crdt/src/cli` in the `evolv/manager` monorepo and rebuilt
against this project's `DocumentUpdate` table — no framework dependency, no
NestJS, no DI container, just plain classes wired up in `src/cli.ts`.

## Setup

```bash
npm install
```

The CLI reads and writes the existing `DocumentUpdate` table managed by
`@resume-builder/entities`'s Prisma migrations — there's no table to create.
Set `DATABASE_URL` to a Postgres connection string pointed at that database,
then run:

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname npm run cli -- get-updates -n <name> -U <uid>
DATABASE_URL=postgres://user:pass@host:5432/dbname npm run cli -- restore -n <name> -U <uid>
```

Or build once and use the `bin` entry:

```bash
npm run build
DATABASE_URL=... ./dist/cli.js restore -n <name> -U <uid>
```

`<name>` is a document name as written by the Hocuspocus server (e.g.
`resume:<resumeId>` or `profile:<uid>`); `<uid>` is the owning user's ID.
Together they identify one document's update stream — see Schema below.

## Commands

- `get-updates` — apply a document's stored updates (all, or a count) and
  print/write the resulting state. Supports stepping through updates
  one-by-one (`--step`) or tailing to a timestamped file (`--tail`).
- `restore` — pick a restore point (by sequence, timestamp, or interactively)
  and either `view` it read-only or `new-document` it (copies the updates up
  to that point into a brand-new document name, leaving the original
  untouched — despite the name, this strategy is **not** destructive).

## Schema

```prisma
model DocumentUpdate {
  id        String   @id @default(cuid())
  name      String
  uid       String
  sequence  Int
  update    Bytes
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([name, uid, sequence(sort: Desc)])
}
```

One row per Yjs update. A document's identity is the `(name, uid)` pair, not
`id` — `id` only uniquely identifies the row. `getItems` reads all rows for a
`(name, uid)` pair ordered by `sequence`; `createNewDocument` bulk-inserts a
fresh set of rows under a new `name` (same `uid`), renumbering `sequence`
sequentially from 1 (the restore strategies assume contiguous sequences
starting at 1).

## What changed from the source repo

- **No NestJS.** `StorageService`, `StrategyRegistry` (was `StrategyService`),
  and both commands are now built with `new` in `cli.ts` and passed down
  through plain constructors — no modules, no `@Injectable()`, no
  `INestApplicationContext`.
- **No AWS.** `providers/credentials.provider.ts` and the `--aws-profile`/
  `--stage` preAction hook are gone; connection config is just `DATABASE_URL`.
- **Storage targets this project's real `DocumentUpdate` table** instead of a
  placeholder `incremental_updates` table — `src/storage/storage-service.ts`
  talks to Postgres directly via `pg`, keyed by `(name, uid)` instead of a
  single `metamodel_id`, and ordered by `sequence` instead of `update_id`.
- Renamed `strategy.service.ts` → `strategy-registry.ts` to reflect that it's
  now a plain lookup map, not an injectable service.
- The `new-document-strategy.ts` log line that said `"...in DynamoDB"` now
  says `"...in Postgres"`.

## Not carried over

The original `StorageService` also implemented Hocuspocus's `Extension`
interface (`onLoadDocument`/`onChange`/`onStoreDocument`) to persist live
document edits from a running Hocuspocus server. This CLI only reads existing
updates and writes new documents wholesale — it doesn't need to buffer or
append incremental edits. That live persistence path already exists in
`packages/crdt/src/modules/storage/storage.service.ts` and is out of scope
for this CLI.
