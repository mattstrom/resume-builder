import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchResultFeedbackType {
	@Field(() => ID)
	id: string;

	@Field()
	searchRunId: string;

	@Field()
	resultId: string;

	@Field()
	resultType: string;

	@Field(() => Int)
	rank: number;

	@Field(() => Float)
	agentScore: number;

	@Field()
	relevant: boolean;

	@Field()
	updatedAt: Date;
}
