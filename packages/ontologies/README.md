# @resume-builder/ontologies

Controlled vocabularies for career data.

A **vocabulary** is a set of named concepts arranged in a tree. Each concept has
a stable id (what you store in the database), a display label, an optional
parent, and a list of synonyms.

Defining one gives you three things from a single source:

- a **Zod enum**, for structured agent output,
- a **markdown block**, for pasting into agent instructions,
- a **normalizer**, that matches free text onto canonical ids.

That is the point. The tag list in `facts-extractor.agent.ts` is currently a
hardcoded markdown block inside a prompt string, so the values an agent is told
to emit and the values the rest of the system understands are two separate facts
kept in sync by hand. Here they are one fact.

## Defining a vocabulary

```ts
import { vocabulary } from '@resume-builder/ontologies';

export const example = vocabulary('example', {
	backend: { label: 'Backend' },
	'distributed-systems': {
		label: 'Distributed Systems',
		parent: 'backend',
		synonyms: ['distsys', 'Distributed Computing'],
	},
});
```

`parent` is checked against the keys of the same object, so a typo is a compile
error. Cycles and unknown parents throw at startup.

## Using one

```ts
import { role, seniority, normalizeTechnologies } from '@resume-builder/ontologies';

role.normalize('Sr. SRE'); // 'site-reliability-engineer'
seniority.normalize('L5'); // 'senior'
role.expand('platform-engineer'); // also matches SRE, DevOps, infrastructure
role.contains('engineering', 'backend-engineer'); // true
seniority.zod; // z.enum([...]) for agent output
role.prompt({ synonyms: true }); // markdown tree for agent instructions

normalizeTechnologies(['React.js', 'k8s', 'Blorptron']);
// { resolved: ['React', 'Kubernetes'], unresolved: ['Blorptron'] }
```

`unresolved` is the useful half. It is the backlog of synonyms worth adding, and
it is how you notice an extraction agent inventing technologies.

## Two design decisions worth knowing

**`expand()` is what the tree is for.** A posting asking for a "platform
engineer" should match evidence filed under `site-reliability-engineer`.
Embeddings get this right often but not reliably, and cannot explain themselves.
`expand()` is exact and auditable.

**Role and seniority are separate.** "Staff Backend Engineer" is
`role:backend-engineer` plus `seniority:staff`, not one concept. Combining them
would multiply the role tree by the length of the ladder and make it impossible
to match on role while negotiating on level.

## What's here

| Export               | Concepts | Notes                           |
| -------------------- | -------- | ------------------------------- |
| `role`               | 37       | what someone does               |
| `seniority`          | 17       | IC and management tracks        |
| `industry`           | 41       | company verticals               |
| `companyStage`       | 14       | seed, public, nonprofit, …      |
| `engagementType`     | 13       | full-time, contract, OSS, …     |
| `workArrangement`    | 3        | mirrors the `LocationType` enum |
| `technologyCategory` | 152      | kinds of software               |
| `technology`         | 8,775    | named products (lookup table)   |

`technology` is a plain lookup table rather than a vocabulary — there are far too
many entries for a union type or a usable enum. It answers "given `k8s`, what is
this and what kind of thing is it", and resolves into `technologyCategory`.

## Regenerating the technology data

The two technology files are generated from O\*NET, a free public dataset of
occupations and the software used in them. Everything else is hand-written.

```sh
npm run import:onet     # downloads (and caches) O*NET, rewrites generated files
```

Generated files are checked in; regenerate deliberately, review the diff, and
re-run tests. `technology.ts` declares synonyms by canonical name, and the lookup
builder throws at startup if a rename orphans one.

O\*NET data is CC BY 4.0 and requires attribution — see [`NOTICE`](./NOTICE).
