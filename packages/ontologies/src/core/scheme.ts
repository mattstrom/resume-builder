import { z } from 'zod';

import { looseKey, tightKey } from './labels.js';
import type {
	Concept,
	ConceptDefinition,
	ExternalRef,
	NormalizeReport,
	SchemeOptions,
} from './types.js';

export interface PromptOptions {
	/** Include scope notes under each concept. Off by default to keep prompts small. */
	definitions?: boolean;
	/** Include synonyms in parentheses. Useful when the model must map free text. */
	altLabels?: boolean;
	/** Restrict the rendered tree to these concepts and their ancestors. */
	only?: readonly string[];
	/** Deepest level to render; roots are depth 0. */
	maxDepth?: number;
}

export interface ConceptScheme<K extends string = string> {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	/** Every concept id, including deprecated ones, in authored order. */
	readonly keys: readonly K[];
	/** Concept ids safe to assign to new data. */
	readonly activeKeys: readonly K[];
	readonly concepts: ReadonlyMap<K, Concept<K>>;

	/** Type guard — narrows an arbitrary string to a member of this scheme. */
	has(value: string): value is K;
	/** Look up a concept, throwing if the id is not in the scheme. */
	get(id: K): Concept<K>;
	/** Concepts with no parent. */
	roots(): Concept<K>[];
	/** Parent chain from the immediate parent up to the root. */
	ancestors(id: K): K[];
	/** Every descendant, depth-first. */
	descendants(id: K): K[];
	/**
	 * The concept plus all its descendants — the set to search for when a job
	 * requirement names a broad concept and evidence is filed under narrow ones.
	 */
	expand(id: K): K[];
	/** True when `id` is `ancestor` or sits beneath it. */
	subsumes(ancestor: K, id: K): boolean;

	/** Resolve one free-text label to a concept id, following deprecations. */
	normalize(label: string): K | undefined;
	/** Resolve a batch, reporting what failed so callers can log gaps. */
	normalizeAll(labels: readonly string[]): NormalizeReport<K>;

	/** All mapping properties for a concept, across every authority. */
	alignments(id: K): ExternalRef[];

	/** `z.enum` over the active concept ids, for structured agent output. */
	readonly zod: z.ZodEnum<Record<K, K>>;
	/** Markdown rendering of the hierarchy for injection into agent instructions. */
	prompt(options?: PromptOptions): string;
}

/**
 * Define a concept scheme.
 *
 * `broader`, `related`, and `replacedBy` are typed against the keys of the same
 * object literal, so referencing a concept that does not exist fails to compile.
 * The runtime checks below catch the same class of error in generated schemes,
 * which are cast rather than inferred.
 */
export function scheme<const D extends Record<string, ConceptDefinition<Extract<keyof D, string>>>>(
	id: string,
	definitions: D,
	options: SchemeOptions = {},
): ConceptScheme<Extract<keyof D, string>> {
	type K = Extract<keyof D, string>;

	const keys = Object.keys(definitions) as K[];

	if (keys.length === 0) {
		throw new Error(`Concept scheme "${id}" defines no concepts`);
	}

	const narrower = new Map<K, K[]>(keys.map((key) => [key, []]));

	for (const key of keys) {
		const definition = definitions[key] as ConceptDefinition<K>;
		const parent = definition.broader;

		if (parent !== undefined) {
			if (!(parent in definitions)) {
				throw new Error(`Concept "${id}:${key}" has unknown broader concept "${parent}"`);
			}

			narrower.get(parent)!.push(key);
		}

		if (definition.replacedBy !== undefined && !(definition.replacedBy in definitions)) {
			throw new Error(
				`Concept "${id}:${key}" is replaced by unknown concept "${definition.replacedBy}"`,
			);
		}

		for (const relation of definition.related ?? []) {
			if (!(relation in definitions)) {
				throw new Error(`Concept "${id}:${key}" relates to unknown concept "${relation}"`);
			}
		}
	}

	// Walking to the root doubles as cycle detection: a cycle never terminates,
	// so we bound the walk by the number of concepts.
	function depthOf(key: K): number {
		let depth = 0;
		let cursor = definitions[key]?.broader as K | undefined;

		while (cursor !== undefined) {
			depth += 1;

			if (depth > keys.length) {
				throw new Error(`Concept scheme "${id}" has a cycle in broader chain at "${key}"`);
			}

			cursor = definitions[cursor]?.broader as K | undefined;
		}

		return depth;
	}

	const concepts = new Map<K, Concept<K>>();

	for (const key of keys) {
		const definition = definitions[key] as ConceptDefinition<K>;

		concepts.set(key, {
			...definition,
			id: key,
			scheme: id,
			narrower: narrower.get(key)!,
			children: narrower.get(key)!,
			depth: depthOf(key),
		});
	}

	// Label index. Concept ids are registered first and never overwritten, so an
	// alt label on one concept can't hijack another concept's canonical id.
	const looseIndex = new Map<string, K>();
	const tightIndex = new Map<string, K>();

	function register(label: string, key: K, force = false): void {
		const loose = looseKey(label);
		const tight = tightKey(label);

		if (loose && (force || !looseIndex.has(loose))) {
			looseIndex.set(loose, key);
		}

		if (tight && !tightIndex.has(tight)) {
			tightIndex.set(tight, key);
		}
	}

	for (const key of keys) {
		register(key, key, true);
	}

	for (const key of keys) {
		const definition = definitions[key] as ConceptDefinition<K>;

		register(definition.label, key);

		for (const label of definition.altLabels ?? []) {
			register(label, key);
		}

		for (const label of definition.hiddenLabels ?? []) {
			register(label, key);
		}
	}

	function resolveDeprecation(key: K): K {
		let cursor = key;

		for (let hops = 0; hops <= keys.length; hops += 1) {
			const replacement = definitions[cursor]?.replacedBy as K | undefined;

			if (replacement === undefined) {
				return cursor;
			}

			cursor = replacement;
		}

		throw new Error(`Concept scheme "${id}" has a cycle in replacedBy chain at "${key}"`);
	}

	function normalize(label: string): K | undefined {
		const direct = looseIndex.get(looseKey(label)) ?? tightIndex.get(tightKey(label));

		return direct === undefined ? undefined : resolveDeprecation(direct);
	}

	function descendants(key: K): K[] {
		const output: K[] = [];
		const stack = [...(narrower.get(key) ?? [])].reverse();

		while (stack.length > 0) {
			const current = stack.pop()!;

			output.push(current);
			stack.push(...[...(narrower.get(current) ?? [])].reverse());
		}

		return output;
	}

	function ancestors(key: K): K[] {
		const output: K[] = [];
		let cursor = definitions[key]?.broader as K | undefined;

		while (cursor !== undefined) {
			output.push(cursor);
			cursor = definitions[cursor]?.broader as K | undefined;
		}

		return output;
	}

	const activeKeys = keys.filter((key) => !definitions[key]?.deprecated);

	function render(options: PromptOptions): string {
		const { definitions: showDefinitions, altLabels: showAltLabels, only, maxDepth } = options;

		let visible: Set<K> | undefined;

		if (only !== undefined) {
			visible = new Set<K>();

			for (const value of only) {
				if (!(value in definitions)) continue;

				const key = value as K;

				visible.add(key);

				for (const ancestor of ancestors(key)) {
					visible.add(ancestor);
				}
			}
		}

		const lines: string[] = [];

		function walk(key: K, depth: number): void {
			if (maxDepth !== undefined && depth > maxDepth) return;
			if (visible !== undefined && !visible.has(key)) return;

			const definition = definitions[key] as ConceptDefinition<K>;

			if (!definition.deprecated) {
				const parts = [`${'  '.repeat(depth)}- \`${key}\` — ${definition.label}`];

				if (showAltLabels && definition.altLabels?.length) {
					parts.push(` (aka ${definition.altLabels.join(', ')})`);
				}

				if (showDefinitions && definition.definition) {
					parts.push(`: ${definition.definition}`);
				}

				lines.push(parts.join(''));
			}

			for (const child of narrower.get(key) ?? []) {
				walk(child, depth + 1);
			}
		}

		for (const key of keys) {
			if (definitions[key]?.broader === undefined) {
				walk(key, 0);
			}
		}

		return lines.join('\n');
	}

	return {
		id,
		title: options.title ?? id,
		description: options.description,
		keys,
		activeKeys,
		concepts,

		has(value): value is K {
			return value in definitions;
		},

		get(key) {
			const concept = concepts.get(key);

			if (concept === undefined) {
				throw new Error(`Concept scheme "${id}" has no concept "${key}"`);
			}

			return concept;
		},

		roots() {
			return keys
				.filter((key) => definitions[key]?.broader === undefined)
				.map((key) => concepts.get(key)!);
		},

		ancestors,
		descendants,

		expand(key) {
			return [key, ...descendants(key)];
		},

		subsumes(ancestor, key) {
			return key === ancestor || ancestors(key).includes(ancestor);
		},

		normalize,

		normalizeAll(labels) {
			const report: NormalizeReport<K> = {
				resolved: [],
				unresolved: [],
				mapping: {},
			};
			const seen = new Set<K>();

			for (const label of labels) {
				const resolved = normalize(label);

				if (resolved === undefined) {
					if (!report.unresolved.includes(label)) {
						report.unresolved.push(label);
					}

					continue;
				}

				report.mapping[label] = resolved;

				if (!seen.has(resolved)) {
					seen.add(resolved);
					report.resolved.push(resolved);
				}
			}

			return report;
		},

		alignments(key) {
			const definition = definitions[key] as ConceptDefinition<K> | undefined;

			if (definition === undefined) return [];

			return [
				...(definition.exactMatch ?? []),
				...(definition.closeMatch ?? []),
				...(definition.broadMatch ?? []),
				...(definition.narrowMatch ?? []),
			];
		},

		get zod() {
			return z.enum(activeKeys as [K, ...K[]]) as z.ZodEnum<Record<K, K>>;
		},

		prompt(promptOptions = {}) {
			return render(promptOptions);
		},
	};
}
