import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ConceptQualifier } from '@resume-builder/entities';

@ObjectType()
export class JobRequirementConceptValueType {
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
}

@ObjectType()
export class JobRequirementConceptType {
	@Field(() => ID)
	jobRequirementId: string;

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

	@Field(() => JobRequirementConceptValueType)
	concept: JobRequirementConceptValueType;
}

@ObjectType()
export class JobRequirementType {
	@Field(() => ID)
	id: string;

	@Field()
	applicationId: string;

	@Field()
	kind: string;

	@Field()
	what: string;

	@Field(() => [String])
	technologies: string[];

	@Field(() => [String])
	tags: string[];

	@Field(() => [JobRequirementConceptType])
	concepts: JobRequirementConceptType[];

	@Field()
	createdAt: Date;
}
