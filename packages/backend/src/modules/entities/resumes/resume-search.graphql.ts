import {
	Field,
	Float,
	ID,
	ObjectType,
	registerEnumType,
} from '@nestjs/graphql';
import { ResumeSummary } from '@resume-builder/entities';

export enum ResumeSearchMatchKind {
	NAME = 'NAME',
	COMPANY = 'COMPANY',
	DOMINANT_THEME = 'DOMINANT_THEME',
	SUMMARY_THEME = 'SUMMARY_THEME',
	TECHNOLOGY = 'TECHNOLOGY',
	PROJECT = 'PROJECT',
	CONTENT_THEME = 'CONTENT_THEME',
	SEMANTIC = 'SEMANTIC',
}

registerEnumType(ResumeSearchMatchKind, { name: 'ResumeSearchMatchKind' });

@ObjectType()
export class ResumeSearchMatch {
	@Field(() => ResumeSearchMatchKind)
	kind: ResumeSearchMatchKind;

	@Field()
	label: string;
}

@ObjectType()
export class ResumeSearchResult {
	@Field(() => ID)
	resumeId: string;

	@Field()
	name: string;

	@Field()
	company: string;

	@Field({ nullable: true })
	level?: string;

	@Field()
	base: boolean;

	@Field({ nullable: true })
	applicationId?: string;

	@Field(() => ResumeSummary, { nullable: true })
	summary?: ResumeSummary;

	@Field()
	updatedAt: Date;

	@Field(() => Float, {
		description: 'Opaque rank used only to order this result set',
	})
	score: number;

	@Field(() => [ResumeSearchMatch])
	matches: ResumeSearchMatch[];
}
