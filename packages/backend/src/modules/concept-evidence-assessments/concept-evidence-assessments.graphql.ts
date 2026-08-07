import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class ConceptEvidenceAssessmentType {
	@Field(() => ID)
	id: string;

	@Field(() => ID)
	applicationId: string;

	@Field(() => ID)
	resumeId: string;

	@Field()
	inputHash: string;

	@Field(() => Int)
	evaluatorVersion: number;

	@Field(() => GraphQLJSON)
	result: unknown;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}
