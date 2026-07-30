import { looseKey, tightKey } from './labels.js';

/** Compact row format used by the generated lexicon file. */
export type TechnologyEntry = readonly [
	name: string,
	category: string,
	hot: 0 | 1,
	inDemand: 0 | 1,
];

export interface LexiconRecord {
	/** Canonical product name as published by the source vocabulary. */
	name: string;
	/** Concept id in the `technology-category` vocabulary. */
	category: string;
	/** Source flags this technology as frequently requested by employers. */
	hot: boolean;
	/** Source flags this technology as sought across a broad range of employers. */
	inDemand: boolean;
}

export interface Lexicon {
	readonly size: number;
	/** Match a free-text technology name to its canonical record. */
	resolve(label: string): LexiconRecord | undefined;
	/** Every record, in source order. */
	all(): LexiconRecord[];
	/** Records filed under a category concept. */
	byCategory(category: string): LexiconRecord[];
}

/**
 * A lookup table of technology names.
 *
 * Deliberately not a `Vocabulary`: there are thousands of these, and nobody
 * wants a Zod enum over the lot. All callers want is "given `k8s`, tell me this
 * is Kubernetes and it's application server software" — which is all this does.
 *
 * `synonyms` supplies shorthand the source data omits. Keys are matched with the
 * same folding as names, so `k8s` also catches `K8S` and `k-8-s`.
 */
export function lexicon(
	entries: readonly TechnologyEntry[],
	synonyms: Readonly<Record<string, string>> = {},
): Lexicon {
	const records: LexiconRecord[] = entries.map(([name, category, hot, inDemand]) => ({
		name,
		category,
		hot: hot === 1,
		inDemand: inDemand === 1,
	}));

	const loose = new Map<string, LexiconRecord>();
	const tight = new Map<string, LexiconRecord>();

	for (const record of records) {
		const looseId = looseKey(record.name);
		const tightId = tightKey(record.name);

		// First occurrence wins; the generated file is sorted, so this is stable.
		if (looseId && !loose.has(looseId)) {
			loose.set(looseId, record);
		}
		if (tightId && !tight.has(tightId)) {
			tight.set(tightId, record);
		}
	}

	// Synonyms are applied last and *do* override, since they are hand-curated
	// and exist precisely to correct what folding alone gets wrong.
	for (const [alias, canonical] of Object.entries(synonyms)) {
		const target = loose.get(looseKey(canonical)) ?? tight.get(tightKey(canonical));

		if (target === undefined) {
			throw new Error(`Synonym "${alias}" points at unknown technology "${canonical}"`);
		}

		const looseAlias = looseKey(alias);
		const tightAlias = tightKey(alias);

		if (looseAlias) {
			loose.set(looseAlias, target);
		}
		if (tightAlias) {
			tight.set(tightAlias, target);
		}
	}

	const byCategory = new Map<string, LexiconRecord[]>();

	for (const record of records) {
		const bucket = byCategory.get(record.category);

		if (bucket === undefined) {
			byCategory.set(record.category, [record]);
		} else {
			bucket.push(record);
		}
	}

	return {
		size: records.length,

		resolve(label) {
			const direct = loose.get(looseKey(label)) ?? tight.get(tightKey(label));

			if (direct !== undefined) {
				return direct;
			}

			// The source spells the JS ecosystem three different ways — `Vue.js`,
			// `MeteorJS`, `Ext JS` — which the tight fold already unifies, since all
			// three reduce to the same key. What it cannot do is reach a canonical
			// name that carries no suffix at all: `React.js` folds to `reactjs`,
			// while the entry is plain `React`. Retry without the suffix, but only
			// after a direct miss, so a real `…JS` product always wins.
			const tightLabel = tightKey(label);

			if (tightLabel.length > 2 && tightLabel.endsWith('js')) {
				return tight.get(tightLabel.slice(0, -2));
			}

			return undefined;
		},

		all() {
			return [...records];
		},

		byCategory(category) {
			return [...(byCategory.get(category) ?? [])];
		},
	};
}
