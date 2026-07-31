import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FactType {
	@Field(() => ID)
	id: string;

	@Field()
	uid: string;

	@Field()
	kind: string;

	@Field({ nullable: true })
	entityType?: string;

	@Field({ nullable: true })
	entityId?: string;

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

	@Field(() => [String])
	tags: string[];

	@Field(() => [String])
	technologies: string[];

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
export class CreateFactInput {
	@Field()
	kind: string;

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

	@Field(() => [String], { nullable: true })
	tags?: string[];

	@Field(() => [String], { nullable: true })
	technologies?: string[];

	@Field({ nullable: true })
	entityType?: string;

	@Field({ nullable: true })
	entityId?: string;
}

@InputType()
export class UpdateFactInput {
	@Field({ nullable: true })
	kind?: string;

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

	@Field(() => [String], { nullable: true })
	tags?: string[];

	@Field(() => [String], { nullable: true })
	technologies?: string[];

	@Field({ nullable: true })
	entityType?: string;

	@Field({ nullable: true })
	entityId?: string;
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
export class UpsertFactConceptInput {
	@Field()
	vocabulary: string;

	@Field()
	key: string;

	@Field()
	label: string;

	@Field()
	relation: string;

	@Field({ nullable: true })
	source?: string;

	@Field({ nullable: true })
	confidence?: number;
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
