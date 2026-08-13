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

const score = () => z.number().refine((n) => n >= 0 && n <= 1, { message: 'Must be 0–1' });
const explanation = (dimension: string) =>
	z
		.string()
		.trim()
		.min(1)
		.max(800)
		.describe(
			`Evidence-based explanation of the ${dimension} score, comparing posting evidence with the candidate preference`,
		);

export const analysisSchema = z.object({
	skillRelevance: score(),
	experienceRelevance: score(),
	roleLevelFit: score(),
	roleLevelFitExplanation: explanation('role-level fit'),
	locationFit: score(),
	locationFitExplanation: explanation('location fit'),
	compensationFit: score(),
	compensationFitExplanation: explanation('compensation fit'),
	companyFit: score(),
	companyFitExplanation: explanation('company fit'),
	logisticalFit: score(),
	overallFit: score(),
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
