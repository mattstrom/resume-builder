import {
	PgEducationSchema,
	PgJobSchema,
	projectSchema,
	skillSchema,
	volunteeringSchema,
} from '@resume-builder/entities';
import { z } from 'zod';

export const careerContextBundleSchema = z.object({
	profile: z.any(),
	education: z.array(PgEducationSchema),
	jobs: z.array(PgJobSchema),
	projects: z.array(projectSchema),
	skills: z.array(skillSchema),
	volunteering: z.array(volunteeringSchema),
});

export const supportingItemSchema = z.object({
	sourceType: z.enum(['job', 'project', 'skill', 'education', 'volunteering', 'profile']),
	sourceName: z.string().describe('Human-readable reference: company name, project name, etc.'),
	evidence: z.string().describe('Why this career item supports the requirement'),
});

export const requirementMatchSchema = z.object({
	requirement: z.string().describe('The job summary item being assessed'),
	category: z.enum([
		'required-skill',
		'preferred-skill',
		'experience',
		'education',
		'tech-stack',
		'other',
	]),
	matchStrength: z.enum(['strong', 'partial', 'none']),
	supportingItems: z.array(supportingItemSchema),
	notes: z.string().optional().describe('Gaps or caveats for this requirement'),
});

export const requirementMatchReportSchema = z.object({
	matches: z.array(requirementMatchSchema),
	unmatchedStrengths: z
		.array(z.string())
		.describe('Notable career items that support nothing in the job summary'),
	overallSummary: z.string(),
});

export type CareerContextBundle = z.infer<typeof careerContextBundleSchema>;
export type SupportingItem = z.infer<typeof supportingItemSchema>;
export type RequirementMatch = z.infer<typeof requirementMatchSchema>;
export type RequirementMatchReport = z.infer<typeof requirementMatchReportSchema>;
