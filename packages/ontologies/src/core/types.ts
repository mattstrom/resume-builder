/**
 * A vocabulary is a set of named concepts arranged in a tree.
 *
 * Each concept has a stable id (the slug you store in the database), a display
 * label, an optional parent, and a list of synonyms used to recognize the
 * concept in free text.
 */

export type Authority =
	| 'onet'
	| 'unspsc'
	| 'soc'
	| 'esco'
	| 'naics'
	| 'wikidata';
export type ExternalRef = `${Authority}:${string}`;

/**
 * A concept as you write it.
 *
 * `parent` is constrained to the keys of the same vocabulary, so a typo in a
 * parent name is a compile error rather than a runtime surprise.
 */
export interface ConceptDefinition<K extends string = string> {
	/** How the concept is displayed. */
	label: string;
	/** Optional note explaining what does and does not belong here. */
	definition?: string;
	/** The concept this one sits under. */
	parent?: K;
	/** Other ways people write this concept. Matched case- and punctuation-insensitively. */
	synonyms?: readonly string[];
	/** Optional ordering weight. Only the seniority vocabulary uses this. */
	rank?: number;
	/** SKOS-style parent; equivalent to `parent` in the original vocabulary API. */
	broader?: K;
	/** SKOS-style alternate and hidden labels. */
	altLabels?: readonly string[];
	hiddenLabels?: readonly string[];
	/** Related concepts in the same scheme. */
	related?: readonly K[];
	/** Lifecycle metadata for concepts that should no longer be assigned. */
	deprecated?: boolean;
	replacedBy?: K;
	/** Mappings to external controlled vocabularies. */
	exactMatch?: readonly ExternalRef[];
	closeMatch?: readonly ExternalRef[];
	broadMatch?: readonly ExternalRef[];
	narrowMatch?: readonly ExternalRef[];
}

/** A concept after the vocabulary has worked out its place in the tree. */
export interface Concept<
	K extends string = string,
> extends ConceptDefinition<K> {
	/** The stable slug — this is what gets persisted. */
	readonly id: K;
	/** Name of the vocabulary this concept belongs to. */
	readonly vocabulary?: string;
	/** Name of the SKOS-style concept scheme, when created with `scheme()`. */
	readonly scheme?: string;
	/** Direct children. */
	readonly children: readonly K[];
	/** SKOS-style direct children; equivalent to `children`. */
	readonly narrower?: readonly K[];
	/** How far below a top-level concept this sits; top level is 0. */
	readonly depth: number;
}

export interface VocabularyOptions {
	/** Human-readable name, used when rendering the vocabulary into a prompt. */
	title?: string;
	/** Short note describing what the vocabulary covers. */
	description?: string;
}

export interface SchemeOptions extends VocabularyOptions {}

/** Result of matching a batch of free-text labels against a vocabulary. */
export interface NormalizeReport<K extends string = string> {
	/** Concept ids that matched, deduplicated, in first-seen order. */
	resolved: K[];
	/** Input labels that matched nothing. */
	unresolved: string[];
	/** Raw label -> concept id, so you can see what each match actually did. */
	mapping: Record<string, K>;
}
