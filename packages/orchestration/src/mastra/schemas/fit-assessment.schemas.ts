import { z } from 'zod';

export const jobSummarySchema = z.object({
	requiredSkills: z.array(z.string()).optional(),
	preferredSkills: z.array(z.string()).optional(),
	requiredEducation: z.string().optional(),
	requiredExperience: z.string().optional(),
	roleLevel: z.string().optional(),
	locationPolicy: z.string().optional(),
	compensationRange: z.string().optional(),
	companyStage: z.string().optional(),
	teamSize: z.number().optional(),
	techStack: z.array(z.string()).optional(),
});

export const analysisSchema = z.object({
	skillRelevance: z.number().min(0).max(1),
	experienceRelevance: z.number().min(0).max(1),
	roleLevelFit: z.number().min(0).max(1).optional(),
	locationFit: z.number().min(0).max(1).optional(),
	compensationFit: z.number().min(0).max(1).optional(),
	companyFit: z.number().min(0).max(1).optional(),
	logisticalFit: z.number().min(0).max(1).optional(),
	overallFit: z.number().min(0).max(1),
	strengths: z.array(z.string()),
	weaknesses: z.array(z.string()),
	recommendations: z.array(z.string()),
});

export type JobSummary = z.infer<typeof jobSummarySchema>;
export type Analysis = z.infer<typeof analysisSchema>;

export interface NarrativeSummary {
	headline: string;
	summary: string;
	skills: string[];
	workExperience: Array<{
		company: string;
		role: string;
		startDate?: string;
		endDate?: string;
		highlights: string[];
	}>;
	education: Array<{
		institution: string;
		degree: string;
		field?: string;
		graduationYear?: string;
	}>;
	projects: Array<{
		name: string;
		description: string;
		technologies: string[];
	}>;
}
