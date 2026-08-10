import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { z } from 'zod';

export const CONCEPT_QUALIFIER_OPERATORS = [
	'gte',
	'gt',
	'eq',
	'lte',
	'lt',
	'between',
	'approximately',
] as const;

export const conceptQualifierSchema = z
	.object({
		dimension: z.string().trim().min(1),
		operator: z.enum(CONCEPT_QUALIFIER_OPERATORS),
		value: z.number().nonnegative().optional(),
		min: z.number().nonnegative().optional(),
		max: z.number().nonnegative().optional(),
		unit: z.string().trim().min(1),
	})
	.superRefine((qualifier, context) => {
		if (qualifier.operator === 'between') {
			if (qualifier.min === undefined || qualifier.max === undefined) {
				context.addIssue({
					code: 'custom',
					message: 'Between qualifiers require both min and max values',
				});
			} else if (qualifier.min > qualifier.max) {
				context.addIssue({
					code: 'custom',
					message: 'Qualifier min cannot be greater than max',
				});
			}
		} else if (qualifier.value === undefined) {
			context.addIssue({
				code: 'custom',
				message: `${qualifier.operator} qualifiers require a value`,
			});
		}
	});

@ObjectType()
export class ConceptQualifier {
	@Field()
	dimension: string;

	@Field()
	operator: string;

	@Field(() => Float, { nullable: true })
	value?: number;

	@Field(() => Float, { nullable: true })
	min?: number;

	@Field(() => Float, { nullable: true })
	max?: number;

	@Field()
	unit: string;
}

@InputType()
export class ConceptQualifierInput {
	@Field()
	dimension: string;

	@Field()
	operator: string;

	@Field(() => Float, { nullable: true })
	value?: number;

	@Field(() => Float, { nullable: true })
	min?: number;

	@Field(() => Float, { nullable: true })
	max?: number;

	@Field()
	unit: string;
}

export type ConceptQualifierValue = z.infer<typeof conceptQualifierSchema>;

const conceptAssertionLinkSchema = z.object({
	conceptId: z.string(),
	relation: z.string(),
	source: z.string(),
	confidence: z.number().nullish(),
	qualifier: conceptQualifierSchema.nullish(),
	createdAt: z.date(),
});

export const FactConceptSchema = conceptAssertionLinkSchema.extend({
	factId: z.string(),
});
export type FactConcept = z.infer<typeof FactConceptSchema>;

export const JobRequirementConceptSchema = conceptAssertionLinkSchema.extend({
	jobRequirementId: z.string(),
});
export type JobRequirementConcept = z.infer<typeof JobRequirementConceptSchema>;

export const SkillConceptSchema = conceptAssertionLinkSchema.extend({
	skillId: z.string(),
});
export type SkillConcept = z.infer<typeof SkillConceptSchema>;

export const ProjectConceptSchema = conceptAssertionLinkSchema.extend({
	projectId: z.string(),
});
export type ProjectConcept = z.infer<typeof ProjectConceptSchema>;
