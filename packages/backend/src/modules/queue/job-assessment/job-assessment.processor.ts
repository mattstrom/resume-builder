import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventBus } from '@nestjs/cqrs';
import { analysisSchema, jobSummarySchema } from '@resume-builder/entities';
import { Job } from 'bullmq';
import { outdent } from 'outdent';

import configuration from '../../../configuration';
import { LlmProviderRegistry } from '../../llm/llm-provider-registry.service';
import type { LlmToolDefinition } from '../../llm/interfaces/llm-types';
import { ApplicationsService } from '../../entities/applications/applications.service';
import { ProfilesService } from '../../entities/profiles/profiles.service';
import { ResumesService } from '../../entities/resumes/resumes.service';
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
		'Analyze the fit between a candidate resume and job requirements.',
	inputSchema: {
		type: 'object',
		properties: {
			skillRelevance: {
				type: 'number',
				description: 'Score from 0 to 1 indicating skill match',
			},
			experienceRelevance: {
				type: 'number',
				description: 'Score from 0 to 1 indicating experience match',
			},
			overallFit: {
				type: 'number',
				description: 'Overall fit score from 0 to 1',
			},
			strengths: { type: 'array', items: { type: 'string' } },
			weaknesses: { type: 'array', items: { type: 'string' } },
			recommendations: { type: 'array', items: { type: 'string' } },
		},
		required: [
			'skillRelevance',
			'experienceRelevance',
			'overallFit',
			'strengths',
			'weaknesses',
			'recommendations',
		],
	},
};

@Processor(QUEUES.JOB_ASSESSMENT)
export class JobAssessmentProcessor extends WorkerHost {
	private readonly logger = new Logger(JobAssessmentProcessor.name);

	constructor(
		private readonly eventBus: EventBus,
		private readonly applicationsService: ApplicationsService,
		private readonly profilesService: ProfilesService,
		private readonly resumesService: ResumesService,
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

		const [resume, profile] = await Promise.all([
			application.resumeId
				? this.resumesService
						.find(uid, String(application.resumeId))
						.catch(() => {
							this.logger.warn(
								`Could not fetch resume ${application.resumeId} for application ${applicationId} — proceeding without resume`,
							);
							return null;
						})
				: null,
			this.profilesService.findOne(uid),
		]);

		const resumeText = resume ? JSON.stringify(resume.data) : '';
		const hasResume = resumeText.length > 0;
		const jobPreferencesText =
			profile && Object.keys(profile.jobPreferences).length > 0
				? JSON.stringify(profile.jobPreferences)
				: '';
		const hasJobPreferences = jobPreferencesText.length > 0;

		const { provider: providerName, model } =
			configuration.llms.jobAssessment;
		const provider = this.llmRegistry.getProvider(providerName);
		const toolResults: Record<string, Record<string, unknown>> = {};

		const stream = provider.stream({
			model,
			maxTokens: 4096,
			system: outdent`
				You are a job assessment assistant. You MUST call BOTH tools:
				extract_job_summary AND extract_analysis, in that order.
				${!hasResume ? 'No resume is available — use conservative scores and base the analysis on the job description alone.' : ''}
			`,
			messages: [
				{
					role: 'user',
					content: outdent`
						Job Description:
						${application.jobDescription}

						${hasResume ? `Resume:\n${resumeText}` : 'No resume available.'}

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
