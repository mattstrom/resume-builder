import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventBus } from '@nestjs/cqrs';
import {
	analysisSchema,
	jobSummarySchema,
	NarrativeSummary,
} from '@resume-builder/entities';
import { Job } from 'bullmq';
import { outdent } from 'outdent';

import configuration from '../../../configuration';
import { FIT_ASSESSOR_SYSTEM_PROMPT } from './fit-assessor.rubric';
import { LlmProviderRegistry } from '../../llm/llm-provider-registry.service';
import type { LlmToolDefinition } from '../../llm/interfaces/llm-types';
import { ApplicationsService } from '../../entities/applications/applications.service';
import { ProfilesService } from '../../entities/profiles/profiles.service';
import { QUEUES } from '../queues';
import { JobAssessmentCompletedEvent } from './job-assessment-completed.event';

interface JobAssessmentJobData {
	applicationId: string;
	uid: string;
}

const JOB_SUMMARY_TOOL: LlmToolDefinition = {
	name: 'extract_job_summary',
	description:
		'Extract a structured summary of job requirements from the posting.',
	inputSchema: {
		type: 'object',
		properties: {
			requiredSkills: { type: 'array', items: { type: 'string' } },
			preferredSkills: { type: 'array', items: { type: 'string' } },
			techStack: { type: 'array', items: { type: 'string' } },
			requiredEducation: { type: 'string' },
			requiredExperience: { type: 'string' },
			roleLevel: { type: 'string' },
			locationPolicy: { type: 'string' },
			compensationRange: { type: 'string' },
			companyStage: { type: 'string' },
			teamSize: { type: 'number' },
		},
		required: ['requiredSkills', 'preferredSkills', 'techStack'],
	},
};

const ANALYSIS_TOOL: LlmToolDefinition = {
	name: 'extract_analysis',
	description:
		'Analyze the fit between a candidate resume and job requirements using the scoring rubric.',
	inputSchema: {
		type: 'object',
		properties: {
			skillRelevance: {
				type: 'number',
				description:
					'Score 0-1 per rubric: skill coverage of JD requirements',
			},
			experienceRelevance: {
				type: 'number',
				description: 'Score 0-1 per rubric: work history relevance',
			},
			roleLevelFit: {
				type: 'number',
				description:
					'Score 0-1 per rubric: role level vs. candidate target level',
			},
			locationFit: {
				type: 'number',
				description:
					'Score 0-1 per rubric: location policy vs. candidate preferences',
			},
			compensationFit: {
				type: 'number',
				description:
					'Score 0-1 per rubric: compensation vs. candidate target range',
			},
			companyFit: {
				type: 'number',
				description:
					'Score 0-1 per rubric: company stage, domain, culture fit',
			},
			logisticalFit: {
				type: 'number',
				description:
					'Weighted composite: roleLevelFit×0.30 + locationFit×0.25 + compensationFit×0.25 + companyFit×0.20',
			},
			overallFit: {
				type: 'number',
				description:
					'Weighted composite: skillRelevance×0.25 + experienceRelevance×0.20 + logisticalFit×0.55',
			},
			strengths: { type: 'array', items: { type: 'string' } },
			weaknesses: { type: 'array', items: { type: 'string' } },
			recommendations: { type: 'array', items: { type: 'string' } },
		},
		required: [
			'skillRelevance',
			'experienceRelevance',
			'roleLevelFit',
			'locationFit',
			'compensationFit',
			'companyFit',
			'logisticalFit',
			'overallFit',
			'strengths',
			'weaknesses',
			'recommendations',
		],
	},
};

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

@Processor(QUEUES.JOB_ASSESSMENT)
export class JobAssessmentProcessor extends WorkerHost {
	private readonly logger = new Logger(JobAssessmentProcessor.name);

	constructor(
		private readonly eventBus: EventBus,
		private readonly applicationsService: ApplicationsService,
		private readonly profilesService: ProfilesService,
		private readonly llmRegistry: LlmProviderRegistry,
	) {
		super();
	}

	async process(job: Job<JobAssessmentJobData>): Promise<void> {
		const { applicationId, uid } = job.data;
		this.logger.log(
			`Processing job-assessment job ${job.id} for application ${applicationId}`,
		);

		const application = await this.applicationsService.find(
			uid,
			applicationId,
		);

		if (!application.jobDescription) {
			throw new Error(
				`Application ${applicationId} has no jobDescription`,
			);
		}

		const profile = await this.profilesService.findOne(uid);

		const jobPreferencesText =
			profile && Object.keys(profile.jobPreferences).length > 0
				? JSON.stringify(profile.jobPreferences)
				: '';
		const hasJobPreferences = jobPreferencesText.length > 0;

		const candidateResumeText = profile?.narrativeSummary
			? formatNarrativeSummary(
					profile.narrativeSummary as NarrativeSummary,
				)
			: profile?.narrative
				? stripXmlTags(profile.narrative)
				: '';
		const hasCandidateResume = candidateResumeText.length > 0;

		const { provider: providerName, model } =
			configuration.llms.jobAssessment;
		const provider = this.llmRegistry.getProvider(providerName);
		const toolResults: Record<string, Record<string, unknown>> = {};

		const stream = provider.stream({
			model,
			maxTokens: 4096,
			system: FIT_ASSESSOR_SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: outdent`
						Job Description:
						${application.jobDescription}

						${hasCandidateResume ? `Candidate Resume:\n${candidateResumeText}` : ''}

						${hasJobPreferences ? `Candidate Job Preferences:\n${jobPreferencesText}` : ''}
					`,
				},
			],
			tools: [JOB_SUMMARY_TOOL, ANALYSIS_TOOL],
		});

		for await (const event of stream) {
			if (event.type === 'tool-use') {
				toolResults[event.name] = event.input;
			}
		}

		const rawJobSummary = toolResults['extract_job_summary'];
		const rawAnalysis = toolResults['extract_analysis'];

		if (!rawJobSummary || !rawAnalysis) {
			throw new Error(
				`Claude did not return both required tool calls. Got: ${Object.keys(toolResults).join(', ') || 'none'}`,
			);
		}

		const jobSummary = jobSummarySchema.parse(rawJobSummary);
		const analysis = analysisSchema.parse(rawAnalysis);

		await this.applicationsService.updateAssessment(uid, applicationId, {
			jobSummary,
			analysis,
		} as any);

		this.eventBus.publish(
			new JobAssessmentCompletedEvent(String(job.id), applicationId, uid),
		);
	}
}
