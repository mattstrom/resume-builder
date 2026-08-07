import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { ConceptQualifier, ConceptQualifierInput } from '@resume-builder/entities';

import type { ConceptVocabulary } from '../concepts/concepts.service.js';
import type { FactRelation } from './facts.service.js';

@ObjectType()
export class FactType {
	@Field(() => ID)
	id: string;

	@Field()
	uid: string;

	@Field()
	what: string;

	@Field({ nullable: true })
	impact?: string;

	@Field({ nullable: true })
	scale?: string;

	@Field({ nullable: true })
	citation?: string;

	@Field(() => Int, { nullable: true })
	citationNodeIndex?: number;

	@Field(() => [FactConceptType])
	concepts: FactConceptType[];

	@Field()
	createdAt: Date;
}

@ObjectType()
export class ExpressionType {
	@Field(() => ID)
	id: string;

	@Field()
	factId: string;

	@Field()
	text: string;

	@Field({ nullable: true })
	length?: string;

	@Field({ nullable: true })
	tone?: string;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class ConceptType {
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
export class ConceptSuggestionType {
	@Field()
	vocabulary: string;

	@Field()
	key: string;

	@Field()
	label: string;

	@Field({ nullable: true })
	definition?: string;
}

@ObjectType()
export class ConceptSearchResultType {
	@Field(() => ConceptType)
	concept: ConceptType;

	@Field(() => Float)
	score: number;
}

@ObjectType()
export class FactConceptType {
	@Field(() => ID)
	factId: string;

	@Field(() => ID)
	conceptId: string;

	@Field()
	relation: string;

	@Field()
	source: string;

	@Field({ nullable: true })
	confidence?: number;

	@Field(() => ConceptQualifier, { nullable: true })
	qualifier?: ConceptQualifier;

	@Field(() => ConceptType)
	concept: ConceptType;
}

@ObjectType()
export class ResumeFactType {
	@Field()
	resumeId: string;

	@Field()
	factId: string;

	@Field({ nullable: true })
	expressionId?: string;

	@Field({ nullable: true })
	section?: string;

	@Field(() => Int, { nullable: true })
	position?: number;

	@Field(() => FactType, { nullable: true })
	fact?: FactType;

	@Field(() => ExpressionType, { nullable: true })
	expression?: ExpressionType;
}

@InputType()
export class FactConceptReferenceInput {
	@Field(() => String)
	vocabulary: ConceptVocabulary;

	@Field()
	key: string;

	@Field()
	label: string;
}

@InputType()
export class FactMeaningInput {
	@Field(() => String)
	relation: FactRelation;

	@Field(() => FactConceptReferenceInput)
	concept: FactConceptReferenceInput;

	@Field({ nullable: true })
	source?: string;

	@Field({ nullable: true })
	confidence?: number;

	@Field(() => ConceptQualifierInput, { nullable: true })
	qualifier?: ConceptQualifierInput;
}

@InputType()
export class CreateFactInput {
	@Field()
	what: string;

	@Field({ nullable: true })
	impact?: string;

	@Field({ nullable: true })
	scale?: string;

	@Field({ nullable: true })
	citation?: string;

	@Field(() => Int, { nullable: true })
	citationNodeIndex?: number;

	@Field(() => [FactMeaningInput])
	meanings: FactMeaningInput[];
}

@InputType()
export class UpdateFactInput {
	@Field({ nullable: true })
	what?: string;

	@Field({ nullable: true })
	impact?: string;

	@Field({ nullable: true })
	scale?: string;

	@Field({ nullable: true })
	citation?: string;

	@Field(() => Int, { nullable: true })
	citationNodeIndex?: number;

	@Field(() => [FactMeaningInput], { nullable: true })
	meanings?: FactMeaningInput[];
}

@InputType()
export class CreateExpressionInput {
	@Field()
	text: string;

	@Field({ nullable: true })
	length?: string;

	@Field({ nullable: true })
	tone?: string;
}

@InputType()
export class LinkFactInput {
	@Field()
	factId: string;

	@Field({ nullable: true })
	expressionId?: string;

	@Field({ nullable: true })
	section?: string;

	@Field(() => Int, { nullable: true })
	position?: number;
}
