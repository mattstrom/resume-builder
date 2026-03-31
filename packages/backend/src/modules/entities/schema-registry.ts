import { z } from 'zod';
import {
	resumeSchema,
	resumeContentSchema,
	applicationSchema,
	jobSummarySchema,
	analysisSchema,
	jobSchema,
	educationSchema,
	skillSchema,
	skillGroupSchema,
	projectSchema,
	volunteeringSchema,
	coverLetterSchema,
	contactInformationSchema,
	conversationSchema,
	conversationMessageSchema,
} from '@resume-builder/entities';

const schemas: Record<string, z.ZodType> = {
	resume: resumeSchema,
	'resume-content': resumeContentSchema,
	application: applicationSchema,
	'job-summary': jobSummarySchema,
	analysis: analysisSchema,
	job: jobSchema,
	education: educationSchema,
	skill: skillSchema,
	'skill-group': skillGroupSchema,
	project: projectSchema,
	volunteering: volunteeringSchema,
	'cover-letter': coverLetterSchema,
	'contact-information': contactInformationSchema,
	conversation: conversationSchema,
	'conversation-message': conversationMessageSchema,
};

/**
 * An object containing JSON Schema representations of schemas rather than Zod schemas.
 * The keys are the schema names, and the values are the schemas
 * converted into JSON Schema format.
 */
export const SchemasAsJson = Object.fromEntries(
	Object.entries(schemas).map(([name, schema]) => [
		name,
		schema.toJSONSchema(),
	]),
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
