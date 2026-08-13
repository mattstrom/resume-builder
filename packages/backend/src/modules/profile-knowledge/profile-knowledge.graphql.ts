import { Field, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class ProfileKnowledgeProposalType {
	@Field(() => ID)
	id: string;

	@Field(() => ID)
	feedbackId: string;

	@Field()
	kind: string;

	@Field()
	title: string;

	@Field()
	rationale: string;

	@Field(() => GraphQLJSON)
	payload: unknown;

	@Field()
	status: string;

	@Field(() => ID, { nullable: true })
	acceptedFactId?: string | null;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date, { nullable: true })
	resolvedAt?: Date | null;
}

@ObjectType()
export class RequirementGradeFeedbackType {
	@Field(() => ID)
	id: string;

	@Field(() => ID)
	applicationId: string;

	@Field(() => ID)
	jobRequirementId: string;

	@Field()
	agentGrade: string;

	@Field(() => String, { nullable: true })
	manualGrade?: string | null;

	@Field(() => String, { nullable: true })
	explanation?: string | null;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => [ProfileKnowledgeProposalType])
	proposals: ProfileKnowledgeProposalType[];
}

@ObjectType()
export class ProfileKnowledgeInboxItemType {
	@Field(() => ProfileKnowledgeProposalType)
	proposal: ProfileKnowledgeProposalType;

	@Field(() => ID)
	applicationId: string;

	@Field()
	applicationName: string;

	@Field()
	company: string;

	@Field(() => ID)
	jobRequirementId: string;

	@Field()
	requirement: string;

	@Field()
	agentGrade: string;

	@Field(() => String, { nullable: true })
	manualGrade?: string | null;

	@Field(() => String, { nullable: true })
	explanation?: string | null;
}
