import {
	resumeSchema,
	resumeContentSchema,
	applicationSchema,
	jobSummarySchema,
	analysisSchema,
	projectSchema,
	profileSchema,
	conversationSchema,
	FactSchema,
	ExpressionSchema,
	JobRequirementFactSchema,
	PgJobSchema,
	PgEducationSchema,
	PgSkillSchema,
	PgSkillGroupSchema,
	PgVolunteeringSchema,
	PgCoverLetterSchema,
	PgContactInformationSchema,
	PgConversationMessageSchema,
} from '@resume-builder/entities';
import { z } from 'zod';

const schemas: Record<string, z.ZodType> = {
	resume: resumeSchema,
	'resume-content': resumeContentSchema,
	application: applicationSchema,
	'job-summary': jobSummarySchema,
	analysis: analysisSchema,
	job: PgJobSchema.omit({ createdAt: true, updatedAt: true }),
	education: PgEducationSchema.omit({ createdAt: true, updatedAt: true }),
	skill: PgSkillSchema.omit({ createdAt: true, updatedAt: true }),
	'skill-group': PgSkillGroupSchema.omit({ createdAt: true, updatedAt: true }),
	project: projectSchema,
	volunteering: PgVolunteeringSchema.omit({ createdAt: true, updatedAt: true }),
	'cover-letter': PgCoverLetterSchema.omit({ createdAt: true, updatedAt: true }),
	'contact-information': PgContactInformationSchema.omit({ createdAt: true, updatedAt: true }),
	profile: profileSchema,
	conversation: conversationSchema,
	'conversation-message': PgConversationMessageSchema.omit({ createdAt: true }),
	fact: FactSchema.omit({ createdAt: true }),
	expression: ExpressionSchema.omit({ createdAt: true }),
	'job-requirement-fact': JobRequirementFactSchema.omit({ createdAt: true }),
};

/**
 * An object containing JSON Schema representations of schemas rather than Zod schemas.
 * The keys are the schema names, and the values are the schemas
 * converted into JSON Schema format.
 */
export const SchemasAsJson = Object.fromEntries(
	Object.entries(schemas).map(([name, schema]) => [name, schema.toJSONSchema()]),
);

export const SchemaNames = Object.keys(schemas);
export const SchemaNamesEnum = z.enum(SchemaNames);

export function lookupSchemaByName(name: string): object | null {
	const normalized = name
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/\s+/g, '-')
		.toLowerCase();

	const result = SchemasAsJson[normalized];

	return result ?? null;
}
