import { Field, Float, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { z } from 'zod';

import { ConceptQualifier, ConceptQualifierInput } from './concept-assertion.js';

export enum BulletSourceType {
	JOB = 'job',
	PROJECT = 'project',
	VOLUNTEERING = 'volunteering',
}

export enum BulletStatus {
	DRAFT = 'draft',
	READY = 'ready',
	ARCHIVED = 'archived',
}

@ObjectType()
export class BulletConceptValue {
	@Field(() => ID)
	id: string;

	@Field()
	vocabulary: string;

	@Field()
	key: string;

	@Field()
	label: string;

	@Field({ nullable: true })
	definition?: string;

	@Field({ nullable: true })
	externalUri?: string;
}

@ObjectType()
export class BulletConcept {
	@Field(() => ID)
	bulletId: string;

	@Field(() => ID)
	conceptId: string;

	@Field()
	relation: string;

	@Field()
	source: string;

	@Field(() => Float, { nullable: true })
	confidence?: number;

	@Field(() => ConceptQualifier, { nullable: true })
	qualifier?: ConceptQualifier;

	@Field(() => BulletConceptValue)
	concept: BulletConceptValue;
}

registerEnumType(BulletSourceType, { name: 'BulletSourceType' });
registerEnumType(BulletStatus, { name: 'BulletStatus' });

@ObjectType()
export class Bullet {
	@Field(() => ID)
	id: string;

	@Field()
	uid: string;

	@Field()
	text: string;

	@Field(() => BulletSourceType)
	sourceType: BulletSourceType;

	@Field(() => ID)
	sourceId: string;

	@Field(() => BulletStatus)
	status: BulletStatus;

	@Field(() => Int)
	position: number;

	@Field(() => [BulletConcept])
	concepts: BulletConcept[];

	@Field(() => Float, { nullable: true })
	contextScore?: number;

	@Field({ nullable: true })
	contextNote?: string;

	@Field(() => [String])
	contextWhatWorksWell: string[];

	@Field({ nullable: true })
	contextWhyItMatters?: string;

	@Field(() => [String])
	contextProposedEnhancements: string[];

	@Field(() => Float, { nullable: true })
	actionScore?: number;

	@Field({ nullable: true })
	actionNote?: string;

	@Field(() => [String])
	actionWhatWorksWell: string[];

	@Field({ nullable: true })
	actionWhyItMatters?: string;

	@Field(() => [String])
	actionProposedEnhancements: string[];

	@Field(() => Float, { nullable: true })
	outcomeScore?: number;

	@Field({ nullable: true })
	outcomeNote?: string;

	@Field(() => [String])
	outcomeWhatWorksWell: string[];

	@Field({ nullable: true })
	outcomeWhyItMatters?: string;

	@Field(() => [String])
	outcomeProposedEnhancements: string[];

	@Field(() => Float, { nullable: true })
	clarityScore?: number;

	@Field({ nullable: true })
	clarityNote?: string;

	@Field(() => [String])
	clarityWhatWorksWell: string[];

	@Field({ nullable: true })
	clarityWhyItMatters?: string;

	@Field(() => [String])
	clarityProposedEnhancements: string[];

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateBulletInput {
	@Field()
	text: string;

	@Field(() => BulletSourceType)
	sourceType: BulletSourceType;

	@Field(() => ID)
	sourceId: string;
}

@InputType()
export class UpdateBulletInput {
	@Field({ nullable: true })
	text?: string;

	@Field(() => Float, { nullable: true })
	contextScore?: number;

	@Field({ nullable: true })
	contextNote?: string;

	@Field(() => [String], { nullable: true })
	contextWhatWorksWell?: string[];

	@Field({ nullable: true })
	contextWhyItMatters?: string;

	@Field(() => [String], { nullable: true })
	contextProposedEnhancements?: string[];

	@Field(() => Float, { nullable: true })
	actionScore?: number;

	@Field({ nullable: true })
	actionNote?: string;

	@Field(() => [String], { nullable: true })
	actionWhatWorksWell?: string[];

	@Field({ nullable: true })
	actionWhyItMatters?: string;

	@Field(() => [String], { nullable: true })
	actionProposedEnhancements?: string[];

	@Field(() => Float, { nullable: true })
	outcomeScore?: number;

	@Field({ nullable: true })
	outcomeNote?: string;

	@Field(() => [String], { nullable: true })
	outcomeWhatWorksWell?: string[];

	@Field({ nullable: true })
	outcomeWhyItMatters?: string;

	@Field(() => [String], { nullable: true })
	outcomeProposedEnhancements?: string[];

	@Field(() => Float, { nullable: true })
	clarityScore?: number;

	@Field({ nullable: true })
	clarityNote?: string;

	@Field(() => [String], { nullable: true })
	clarityWhatWorksWell?: string[];

	@Field({ nullable: true })
	clarityWhyItMatters?: string;

	@Field(() => [String], { nullable: true })
	clarityProposedEnhancements?: string[];
}

@InputType()
export class BulletFilterInput {
	@Field(() => BulletSourceType, { nullable: true })
	sourceType?: BulletSourceType;

	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => BulletStatus, { nullable: true })
	status?: BulletStatus;

	@Field({ nullable: true })
	search?: string;

	@Field({ nullable: true })
	conceptKey?: string;

	@Field({ nullable: true, defaultValue: false })
	includeArchived?: boolean;
}

@InputType()
export class BulletConceptReferenceInput {
	@Field()
	vocabulary: string;

	@Field()
	label: string;

	@Field()
	key: string;
}

@InputType()
export class BulletMeaningInput {
	@Field()
	relation: string;

	@Field(() => BulletConceptReferenceInput)
	concept: BulletConceptReferenceInput;

	@Field({ nullable: true })
	source?: string;

	@Field(() => Float, { nullable: true })
	confidence?: number;

	@Field(() => ConceptQualifierInput, { nullable: true })
	qualifier?: ConceptQualifierInput;
}

const scoreSchema = z.number().min(0).max(1).nullable().optional();
const analysisItemsSchema = z.array(z.string().trim().min(1)).max(3).optional();

export const createBulletSchema = z.object({
	text: z.string().trim().min(1),
	sourceType: z.enum(BulletSourceType),
	sourceId: z.string().min(1),
});

export const updateBulletSchema = z.object({
	text: z.string().trim().min(1).optional(),
	contextScore: scoreSchema,
	contextNote: z.string().nullable().optional(),
	contextWhatWorksWell: analysisItemsSchema,
	contextWhyItMatters: z.string().nullable().optional(),
	contextProposedEnhancements: analysisItemsSchema,
	actionScore: scoreSchema,
	actionNote: z.string().nullable().optional(),
	actionWhatWorksWell: analysisItemsSchema,
	actionWhyItMatters: z.string().nullable().optional(),
	actionProposedEnhancements: analysisItemsSchema,
	outcomeScore: scoreSchema,
	outcomeNote: z.string().nullable().optional(),
	outcomeWhatWorksWell: analysisItemsSchema,
	outcomeWhyItMatters: z.string().nullable().optional(),
	outcomeProposedEnhancements: analysisItemsSchema,
	clarityScore: scoreSchema,
	clarityNote: z.string().nullable().optional(),
	clarityWhatWorksWell: analysisItemsSchema,
	clarityWhyItMatters: z.string().nullable().optional(),
	clarityProposedEnhancements: analysisItemsSchema,
});
