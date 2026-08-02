import { lexicon, type LexiconRecord } from '../core/lexicon.js';
import { ONET_TECHNOLOGY_LEXICON } from '../generated/technology-lexicon.js';
import { technologyCategory } from './technology-category.generated.js';

/**
 * Shorthand O*NET does not carry.
 *
 * O*NET names products the way a procurement officer would — `Amazon Web
 * Services AWS software`, `Rust programming language` — and never the way an
 * engineer writes them on a resume. Label folding closes the spelling half of
 * that gap on its own (`React.js`, `ReactJS`, and `React JS` all reach `React`);
 * these are the cases where the two names share nothing to fold.
 *
 * Values must be canonical names present in the lexicon, and the lexicon builder
 * throws at construction if one drifts, so a renamed O*NET entry fails loudly on
 * the next import rather than silently dropping a synonym.
 */
export const TECHNOLOGY_SYNONYMS: Readonly<Record<string, string>> = {
	AWS: 'Amazon Web Services AWS software',
	'Amazon Web Services': 'Amazon Web Services AWS software',
	Azure: 'Microsoft Azure software',
	'Microsoft Azure': 'Microsoft Azure software',
	GCP: 'Google Cloud software',
	'Google Cloud Platform': 'Google Cloud software',
	Kafka: 'Apache Kafka',
	Terraform: 'IBM Terraform',
	Jenkins: 'Jenkins CI',
	Rust: 'Rust programming language',
	Postgres: 'PostgreSQL',
	Mongo: 'MongoDB',
	ES: 'Elasticsearch',
	k8s: 'Kubernetes',
	Rails: 'Ruby on Rails',
	Node: 'Node.js',
	TS: 'TypeScript',
	JS: 'JavaScript',
};

/**
 * Named technologies — languages, frameworks, products, platforms.
 *
 * A plain lookup table rather than a vocabulary, because there are ~8.8k of
 * them. The vocabulary they hang off is {@link technologyCategory}, which is
 * what you reason over, render into prompts, or store as a Zod enum.
 */
export const technology = lexicon(ONET_TECHNOLOGY_LEXICON, TECHNOLOGY_SYNONYMS);

export interface CategorizedTechnology {
	/** Canonical technology name. */
	name: string;
	/** Category concept id in {@link technologyCategory}. */
	category: string;
	/** Human-readable category label. */
	categoryLabel: string;
	/** The authored top-level bucket the category sits under. */
	bucket: string;
	hot: boolean;
	inDemand: boolean;
}

/**
 * Match a free-text technology name and place it in the category tree.
 *
 * The `bucket` is what you want for grouping a resume's skills section: 135
 * categories is too granular to render, 17 buckets is about right.
 */
export function categorizeTechnology(label: string): CategorizedTechnology | undefined {
	const record: LexiconRecord | undefined = technology.resolve(label);

	if (record === undefined) {
		return undefined;
	}

	// `has` is a type guard, so this narrows the lexicon's plain-string category
	// to a key of the vocabulary without a cast — and covers the case where an
	// import renames a category out from under the lexicon.
	if (!technologyCategory.has(record.category)) {
		return undefined;
	}

	const category = technologyCategory.get(record.category);
	const [bucket] = technologyCategory.ancestors(record.category);

	return {
		name: record.name,
		category: record.category,
		categoryLabel: category.label,
		bucket: bucket ?? record.category,
		hot: record.hot,
		inDemand: record.inDemand,
	};
}

/**
 * Split a free-text technology list into canonical names and leftovers.
 *
 * The unresolved list is the point: it is the backlog of synonyms worth adding,
 * and it is how you find out that an extraction agent is inventing technologies.
 */
export function normalizeTechnologies(labels: readonly string[]): {
	resolved: string[];
	unresolved: string[];
} {
	const resolved: string[] = [];
	const unresolved: string[] = [];
	const seen = new Set<string>();

	for (const label of labels) {
		const record = technology.resolve(label);

		if (record === undefined) {
			if (!unresolved.includes(label)) {
				unresolved.push(label);
			}
			continue;
		}

		if (!seen.has(record.name)) {
			seen.add(record.name);
			resolved.push(record.name);
		}
	}

	return { resolved, unresolved };
}

export { technologyCategory };
