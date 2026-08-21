import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { BulletSearchResult } from '../entities/bullets/bullet-search.graphql.js';
import { ResumeSearchResult } from '../entities/resumes/resume-search.graphql.js';
import { ConceptSearchResultType } from '../facts/facts.graphql.js';

export enum AdvancedSearchResultType {
	SUMMARY = 'SUMMARY',
	SKILL = 'SKILL',
	PROJECT = 'PROJECT',
	WORK_HISTORY = 'WORK_HISTORY',
	VOLUNTEERING = 'VOLUNTEERING',
	FACT = 'FACT',
	BULLET = 'BULLET',
	CONCEPT = 'CONCEPT',
	PROFESSIONAL_STATEMENT = 'PROFESSIONAL_STATEMENT',
}

registerEnumType(AdvancedSearchResultType, {
	name: 'AdvancedSearchResultType',
	description: 'Profile result tables that an advanced search should populate.',
});

@ObjectType()
export class AdvancedSearchPayload {
	@Field(() => [ResumeSearchResult])
	resumes: ResumeSearchResult[];

	@Field(() => [BulletSearchResult])
	bullets: BulletSearchResult[];

	@Field(() => [ConceptSearchResultType])
	concepts: ConceptSearchResultType[];
}
