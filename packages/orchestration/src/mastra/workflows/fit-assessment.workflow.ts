import { createStep, createWorkflow } from '@mastra/core/workflows';
import { outdent } from 'outdent';
import { z } from 'zod';

import {
	analysisSchema,
	jobSummarySchema,
	type NarrativeSummary,
} from '../schemas/fit-assessment.schemas';

import { fitAssessmentAgent } from '../agents/fit-assessment.agent';
import { resumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

function formatNarrativeSummary(summary: NarrativeSummary): string {
	const lines: string[] = [];

	lines.push(`Headline: ${summary.headline}`, '');
	lines.push('Summary:', summary.summary, '');

	if (summary.skills.length > 0) {
		lines.push('Skills:', summary.skills.join(', '), '');
	}

	if (summary.workExperience.length > 0) {
		lines.push('Work Experience:');
		for (const exp of summary.workExperience) {
			const dates =
				exp.startDate || exp.endDate
					? ` (${exp.startDate ?? '?'} – ${exp.endDate ?? 'present'})`
					: '';
			lines.push(`${exp.company} — ${exp.role}${dates}`);
			for (const h of exp.highlights) {
				lines.push(`  - ${h}`);
			}
		}
		lines.push('');
	}

	if (summary.education.length > 0) {
		lines.push('Education:');
		for (const edu of summary.education) {
			const field = edu.field ? ` in ${edu.field}` : '';
			const year = edu.graduationYear ? ` (${edu.graduationYear})` : '';
			lines.push(`${edu.degree}${field}, ${edu.institution}${year}`);
		}
		lines.push('');
	}

	if (summary.projects.length > 0) {
		lines.push('Projects:');
		for (const proj of summary.projects) {
			const tech =
				proj.technologies.length > 0
					? ` (${proj.technologies.join(', ')})`
					: '';
			lines.push(`${proj.name}: ${proj.description}${tech}`);
		}
	}

	return lines.join('\n').trim();
}

function stripXmlTags(xml: string): string {
	return xml
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

const fetchAssessmentData = createStep({
	id: 'fetch-assessment-data',
	description:
		'Fetches job description and candidate profile via the backend MCP tools',
	inputSchema: z.object({ applicationId: z.string().uuid() }),
	outputSchema: z.object({
		applicationId: z.string(),
		jobDescription: z.string(),
		candidateText: z.string(),
		jobPreferencesText: z.string(),
	}),
	execute: async ({ inputData }) => {
		const { applicationId } = inputData;
		const toolsets = await resumeBuilderMcpClient.listToolsets();
		const tools = toolsets['resumeBuilder'];

		const [appResult, profileResult] = await Promise.all([
			tools['get_application'].execute!({ id: applicationId }, {} as any),
			tools['get_profile'].execute!({} as any, {} as any),
		]);

		const application = (appResult as any)?.application;
		const profile = (profileResult as any)?.profile;

		if (!application?.jobDescription) {
			throw new Error(
				`Application ${applicationId} has no jobDescription`,
			);
		}

		const jobPreferencesText =
			profile && Object.keys(profile.jobPreferences ?? {}).length > 0
				? JSON.stringify(profile.jobPreferences)
				: '';

		const candidateText = profile?.narrativeSummary
			? formatNarrativeSummary(
					profile.narrativeSummary as NarrativeSummary,
				)
			: profile?.narrative
				? stripXmlTags(profile.narrative as string)
				: '';

		return {
			applicationId,
			jobDescription: application.jobDescription as string,
			candidateText,
			jobPreferencesText,
		};
	},
});

const runFitAssessment = createStep({
	id: 'run-fit-assessment',
	description:
		'Runs the fit assessment agent to extract job summary and analysis scores',
	inputSchema: z.object({
		applicationId: z.string(),
		jobDescription: z.string(),
		candidateText: z.string(),
		jobPreferencesText: z.string(),
	}),
	outputSchema: z.object({
		applicationId: z.string(),
		jobSummary: jobSummarySchema,
		analysis: analysisSchema,
	}),
	execute: async ({ inputData, mastra }) => {
		const {
			applicationId,
			jobDescription,
			candidateText,
			jobPreferencesText,
		} = inputData;

		const agent =
			mastra?.getAgent('fitAssessmentAgent') ?? fitAssessmentAgent;

		const prompt = outdent`
			Job Description:
			${jobDescription}

			${candidateText ? `Candidate Resume:\n${candidateText}` : ''}

			${jobPreferencesText ? `Candidate Job Preferences:\n${jobPreferencesText}` : ''}
		`;

		const result = await agent.generate(
			[{ role: 'user', content: prompt }],
			{ maxSteps: 5 },
		);

		const allToolResults = (result.steps ?? []).flatMap(
			(step: any) => step.toolResults ?? [],
		);

		const jobSummaryResult = allToolResults.find(
			(r: any) => r.toolName === 'extract_job_summary',
		);
		const analysisResult = allToolResults.find(
			(r: any) => r.toolName === 'extract_analysis',
		);

		if (!jobSummaryResult || !analysisResult) {
			throw new Error(
				`Agent did not call both required tools. Got: ${allToolResults.map((r: any) => r.toolName).join(', ') || 'none'}`,
			);
		}

		const jobSummary = jobSummarySchema.parse(jobSummaryResult.result);
		const analysis = analysisSchema.parse(analysisResult.result);

		return { applicationId, jobSummary, analysis };
	},
});

const saveAssessmentResults = createStep({
	id: 'save-assessment-results',
	description:
		'Saves the fit analysis back to the application via the backend MCP tool',
	inputSchema: z.object({
		applicationId: z.string(),
		jobSummary: jobSummarySchema,
		analysis: analysisSchema,
	}),
	outputSchema: z.object({
		jobSummary: jobSummarySchema,
		analysis: analysisSchema,
	}),
	execute: async ({ inputData }) => {
		const { applicationId, jobSummary, analysis } = inputData;
		const toolsets = await resumeBuilderMcpClient.listToolsets();
		const tools = toolsets['resumeBuilder'];

		await tools['update_analysis'].execute!(
			{ applicationId, analysis },
			{} as any,
		);

		return { jobSummary, analysis };
	},
});

const fitAssessmentWorkflow = createWorkflow({
	id: 'fit-assessment-workflow',
	inputSchema: z.object({
		applicationId: z.string().uuid(),
	}),
	outputSchema: z.object({
		jobSummary: jobSummarySchema,
		analysis: analysisSchema,
	}),
})
	.then(fetchAssessmentData)
	.then(runFitAssessment)
	.then(saveAssessmentResults);

fitAssessmentWorkflow.commit();

export { fitAssessmentWorkflow };
