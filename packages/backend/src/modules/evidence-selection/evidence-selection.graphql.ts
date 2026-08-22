import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BulletSourceType } from '@resume-builder/entities';

export enum RequirementRelationType {
	REQUIRES = 'requires',
	EXPECTS = 'expects',
	PREFERS = 'prefers',
}

registerEnumType(RequirementRelationType, {
	name: 'RequirementRelationType',
	description: 'Job-side predicate binding a requirement to a concept.',
});

@ObjectType()
export class SelectedEvidenceType {
	@Field(() => ID)
	id: string;

	@Field()
	text: string;

	@Field(() => BulletSourceType)
	sourceType: BulletSourceType;

	@Field(() => ID)
	sourceId: string;

	@Field(() => Float, {
		description: 'How much this bullet added to coverage when it was chosen.',
	})
	marginalGain: number;

	@Field(() => [ID])
	coversConceptIds: string[];
}

@ObjectType()
export class RequirementGapType {
	@Field(() => ID)
	conceptId: string;

	@Field()
	label: string;

	@Field(() => RequirementRelationType)
	relation: RequirementRelationType;

	@Field(() => Float)
	weight: number;

	@Field(() => [ID], {
		description: 'Requirements that asked for this concept.',
	})
	requirementIds: string[];
}

@ObjectType()
export class CrowdedOutGapType extends RequirementGapType {
	@Field(() => [ID], {
		description: 'Bullets that would have covered this but lost the budget.',
	})
	availableEvidenceIds: string[];
}

@ObjectType()
export class EvidenceGapsType {
	@Field(() => [RequirementGapType], {
		description: 'Nothing in the profile covers these at all.',
	})
	unevidenced: RequirementGapType[];

	@Field(() => [CrowdedOutGapType], {
		description: 'Evidence exists for these but did not fit the budget.',
	})
	crowdedOut: CrowdedOutGapType[];
}

@ObjectType()
export class EvidenceCoverageType {
	@Field(() => Float)
	achieved: number;

	@Field(() => Float, {
		description: 'Coverage an unlimited budget could reach with this profile.',
	})
	possible: number;

	@Field(() => Float)
	ratio: number;
}

@ObjectType()
export class EvidenceBudgetType {
	@Field(() => Int)
	requested: number;

	@Field(() => Int)
	used: number;
}

@ObjectType()
export class EvidenceSelectionPayload {
	@Field(() => [SelectedEvidenceType])
	selected: SelectedEvidenceType[];

	@Field(() => EvidenceGapsType)
	gaps: EvidenceGapsType;

	@Field(() => EvidenceCoverageType)
	coverage: EvidenceCoverageType;

	@Field(() => EvidenceBudgetType)
	budget: EvidenceBudgetType;
}
