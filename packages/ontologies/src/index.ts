export { looseKey, tightKey } from './core/labels.js';
export { lexicon } from './core/lexicon.js';
export type { Lexicon, LexiconRecord, TechnologyEntry } from './core/lexicon.js';
export type {
	Concept,
	ConceptDefinition,
	NormalizeReport,
	VocabularyOptions,
} from './core/types.js';
export { vocabulary } from './core/vocabulary.js';
export type { PromptOptions, Vocabulary } from './core/vocabulary.js';

export { companyStage, engagementType, workArrangement } from './vocabularies/company.js';
export { industry } from './vocabularies/industry.js';
export { role } from './vocabularies/role.js';
export {
	compareSeniority,
	meetsSeniority,
	seniority,
	seniorityRank,
	type SeniorityId,
} from './vocabularies/seniority.js';
export {
	categorizeTechnology,
	normalizeTechnologies,
	technology,
	technologyCategory,
	TECHNOLOGY_SYNONYMS,
	type CategorizedTechnology,
} from './vocabularies/technology.js';
