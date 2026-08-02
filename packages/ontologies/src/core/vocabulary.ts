import { z } from 'zod';

import { looseKey, tightKey } from './labels.js';
import type { Concept, ConceptDefinition, NormalizeReport, VocabularyOptions } from './types.js';

export interface PromptOptions {
	/** Include the definition note under each concept. Off by default to keep prompts small. */
	definitions?: boolean;
	/** Include synonyms in parentheses. Useful when the model must map free text. */
	synonyms?: boolean;
	/** Restrict the rendered tree to these concepts and their parents. */
	only?: readonly string[];
	/** Deepest level to render; top level is 0. */
	maxDepth?: number;
}

export interface Vocabulary<K extends string = string> {
	readonly name: string;
	readonly title: string;
	readonly description?: string;
	/** Every concept id, in the order written. */
	readonly keys: readonly K[];
	readonly concepts: ReadonlyMap<K, Concept<K>>;

	/** Type guard — narrows an arbitrary string to a member of this vocabulary. */
	has(value: string): value is K;
	/** Look up a concept, throwing if the id is not in the vocabulary. */
	get(id: K): Concept<K>;
	/** Concepts with no parent. */
	roots(): Concept<K>[];
	/** Parent chain from the immediate parent up to the top. */
	ancestors(id: K): K[];
	/** Every concept beneath this one, depth-first. */
	descendants(id: K): K[];
	/**
	 * The concept plus everything beneath it.
	 *
	 * This is the one to reach for when matching: a posting asking for a
	 * "platform engineer" should also match evidence filed under the more
	 * specific `site-reliability-engineer`.
	 */
	expand(id: K): K[];
	/** True when `id` is `parent` or sits somewhere beneath it. */
	contains(parent: K, id: K): boolean;

	/** Match one free-text label to a concept id. */
	normalize(label: string): K | undefined;
	/** Match a batch, reporting what failed so you can see the gaps. */
	normalizeAll(labels: readonly string[]): NormalizeReport<K>;

	/** `z.enum` over the concept ids, for structured agent output. */
	readonly zod: z.ZodEnum<Record<K, K>>;
	/** Markdown rendering of the tree, for pasting into agent instructions. */
	prompt(options?: PromptOptions): string;
}

/**
 * Define a vocabulary.
 *
 * `parent` is typed against the keys of the same object literal, so pointing at
 * a concept that does not exist fails to compile. The runtime checks below catch
 * the same mistakes in generated vocabularies, which are cast rather than
 * inferred.
 */
export function vocabulary<
	const D extends Record<string, ConceptDefinition<Extract<keyof D, string>>>,
>(
	name: string,
	definitions: D,
	options: VocabularyOptions = {},
): Vocabulary<Extract<keyof D, string>> {
	type K = Extract<keyof D, string>;

	const keys = Object.keys(definitions) as K[];

	if (keys.length === 0) {
		throw new Error(`Vocabulary "${name}" defines no concepts`);
	}

	const children = new Map<K, K[]>(keys.map((key) => [key, []]));

	for (const key of keys) {
		const parent = (definitions[key] as ConceptDefinition<K>).parent;

		if (parent !== undefined) {
			if (!(parent in definitions)) {
				throw new Error(`Concept "${name}:${key}" has unknown parent "${parent}"`);
			}

			children.get(parent)!.push(key);
		}
	}

	// Walking to the top doubles as cycle detection: a cycle never terminates,
	// so we bound the walk by the number of concepts.
	function depthOf(key: K): number {
		let depth = 0;
		let cursor = definitions[key]?.parent as K | undefined;

		while (cursor !== undefined) {
			depth += 1;

			if (depth > keys.length) {
				throw new Error(`Vocabulary "${name}" has a cycle in the parent chain at "${key}"`);
			}

			cursor = definitions[cursor]?.parent as K | undefined;
		}

		return depth;
	}

	const concepts = new Map<K, Concept<K>>();

	for (const key of keys) {
		concepts.set(key, {
			...(definitions[key] as ConceptDefinition<K>),
			id: key,
			vocabulary: name,
			children: children.get(key)!,
			depth: depthOf(key),
		});
	}

	// Label index. Concept ids are registered first and never overwritten, so a
	// synonym on one concept can't hijack another concept's canonical id.
	const loose = new Map<string, K>();
	const tight = new Map<string, K>();

	function register(label: string, key: K, force = false): void {
		const looseId = looseKey(label);
		const tightId = tightKey(label);

		if (looseId && (force || !loose.has(looseId))) {
			loose.set(looseId, key);
		}
		if (tightId && !tight.has(tightId)) {
			tight.set(tightId, key);
		}
	}

	for (const key of keys) {
		register(key, key, true);
	}

	for (const key of keys) {
		const definition = definitions[key] as ConceptDefinition<K>;

		register(definition.label, key);

		for (const synonym of definition.synonyms ?? []) {
			register(synonym, key);
		}
	}

	function normalize(label: string): K | undefined {
		return loose.get(looseKey(label)) ?? tight.get(tightKey(label));
	}

	function descendants(key: K): K[] {
		const output: K[] = [];
		const stack = [...(children.get(key) ?? [])].reverse();

		while (stack.length > 0) {
			const current = stack.pop()!;

			output.push(current);
			stack.push(...[...(children.get(current) ?? [])].reverse());
		}

		return output;
	}

	function ancestors(key: K): K[] {
		const output: K[] = [];
		let cursor = definitions[key]?.parent as K | undefined;

		while (cursor !== undefined) {
			output.push(cursor);
			cursor = definitions[cursor]?.parent as K | undefined;
		}

		return output;
	}

	function render(promptOptions: PromptOptions): string {
		const {
			definitions: showDefinitions,
			synonyms: showSynonyms,
			only,
			maxDepth,
		} = promptOptions;

		let visible: Set<K> | undefined;

		if (only !== undefined) {
			visible = new Set<K>();

			for (const value of only) {
				if (!(value in definitions)) {
					continue;
				}

				visible.add(value as K);

				for (const ancestor of ancestors(value as K)) {
					visible.add(ancestor);
				}
			}
		}

		const lines: string[] = [];

		function walk(key: K, depth: number): void {
			if (maxDepth !== undefined && depth > maxDepth) {
				return;
			}
			if (visible !== undefined && !visible.has(key)) {
				return;
			}

			const definition = definitions[key] as ConceptDefinition<K>;
			const parts = [`${'  '.repeat(depth)}- \`${key}\` — ${definition.label}`];

			if (showSynonyms && definition.synonyms?.length) {
				parts.push(` (aka ${definition.synonyms.join(', ')})`);
			}

			if (showDefinitions && definition.definition) {
				parts.push(`: ${definition.definition}`);
			}

			lines.push(parts.join(''));

			for (const child of children.get(key) ?? []) {
				walk(child, depth + 1);
			}
		}

		for (const key of keys) {
			if (definitions[key]?.parent === undefined) {
				walk(key, 0);
			}
		}

		return lines.join('\n');
	}

	return {
		name,
		title: options.title ?? name,
		description: options.description,
		keys,
		concepts,

		has(value): value is K {
			return value in definitions;
		},

		get(key) {
			const concept = concepts.get(key);

			if (concept === undefined) {
				throw new Error(`Vocabulary "${name}" has no concept "${key}"`);
			}

			return concept;
		},

		roots() {
			return keys
				.filter((key) => definitions[key]?.parent === undefined)
				.map((key) => concepts.get(key)!);
		},

		ancestors,
		descendants,

		expand(key) {
			return [key, ...descendants(key)];
		},

		contains(parent, key) {
			return key === parent || ancestors(key).includes(parent);
		},

		normalize,

		normalizeAll(labels) {
			const report: NormalizeReport<K> = { resolved: [], unresolved: [], mapping: {} };
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

		get zod() {
			return z.enum(keys as [K, ...K[]]) as z.ZodEnum<Record<K, K>>;
		},

		prompt(promptOptions = {}) {
			return render(promptOptions);
		},
	};
}
