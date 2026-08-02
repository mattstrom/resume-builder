export const EMBEDDING_MODEL = 'fastembed/bge-base-en-v1.5';

export const EMBEDDING_PROFILES = {
	fact: 'fact-evidence:v1',
	'job-requirement': 'job-requirement:v1',
	bullet: 'bullet-job-match:v1',
	concept: 'concept-search:v1',
} as const;

export type EmbeddingEntityType = keyof typeof EMBEDDING_PROFILES;
export type EmbeddingProfile = (typeof EMBEDDING_PROFILES)[EmbeddingEntityType];

export const EMBEDDING_JOB_NAMES = {
	GENERATE: 'generate',
	RECONCILE: 'reconcile',
} as const;

export const EMBEDDING_RECONCILIATION_SCHEDULER = 'embedding-reconciliation';

export const EMBEDDING_RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
