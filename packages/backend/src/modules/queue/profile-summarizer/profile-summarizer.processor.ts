import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventBus } from '@nestjs/cqrs';
import { narrativeSummarySchema } from '@resume-builder/entities';
import { Job } from 'bullmq';

import configuration from '../../../configuration';
import { NARRATIVE_SUMMARIZER_SYSTEM_PROMPT } from './narrative-summarizer.rubric';
import { LlmProviderRegistry } from '../../llm/llm-provider-registry.service';
import type { LlmToolDefinition } from '../../llm/interfaces/llm-types';
import { ProfilesService } from '../../entities/profiles/profiles.service';
import { QUEUES } from '../queues';
import { ProfileNarrativeSummaryCompletedEvent } from './profile-summarizer-completed.event';

interface ProfileNarrativeSummaryJobData {
	uid: string;
}

const EXTRACT_NARRATIVE_SUMMARY_TOOL: LlmToolDefinition = {
	name: 'extract_narrative_summary',
	description:
		'Extract a structured, comprehensive resume summary from the candidate narrative.',
	inputSchema: {
		type: 'object',
		properties: {
			headline: {
				type: 'string',
				description:
					'Professional headline, e.g. "Senior Full-Stack Engineer"',
			},
			summary: {
				type: 'string',
				description:
					'2-3 sentence untargeted professional summary covering seniority and core strengths',
			},
			skills: {
				type: 'array',
				items: { type: 'string' },
				description: 'Deduplicated list of skills and technologies',
			},
			workExperience: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						company: { type: 'string' },
						role: { type: 'string' },
						startDate: { type: 'string' },
						endDate: { type: 'string' },
						highlights: {
							type: 'array',
							items: { type: 'string' },
							description: '2-3 impact-focused bullets',
						},
					},
					required: ['company', 'role', 'highlights'],
				},
			},
			education: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						institution: { type: 'string' },
						degree: { type: 'string' },
						field: { type: 'string' },
						graduationYear: { type: 'string' },
					},
					required: ['institution', 'degree'],
				},
			},
			projects: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						technologies: {
							type: 'array',
							items: { type: 'string' },
						},
					},
					required: ['name', 'description', 'technologies'],
				},
			},
		},
		required: [
			'headline',
			'summary',
			'skills',
			'workExperience',
			'education',
			'projects',
		],
	},
};

function stripXmlTags(xml: string): string {
	return xml
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

@Processor(QUEUES.PROFILE_NARRATIVE_SUMMARY)
export class ProfileNarrativeSummaryProcessor extends WorkerHost {
	private readonly logger = new Logger(ProfileNarrativeSummaryProcessor.name);

	constructor(
		private readonly eventBus: EventBus,
		private readonly profilesService: ProfilesService,
		private readonly llmRegistry: LlmProviderRegistry,
	) {
		super();
	}

	async process(job: Job<ProfileNarrativeSummaryJobData>): Promise<void> {
		const { uid } = job.data;
		this.logger.log(
			`Processing profile-narrative-summary job ${job.id} for uid ${uid}`,
		);

		const profile = await this.profilesService.findOne(uid);

		if (!profile?.narrative?.trim()) {
			throw new Error(`Profile ${uid} has no narrative to summarize`);
		}

		const narrativeText = stripXmlTags(profile.narrative);

		const { provider: providerName, model } =
			configuration.llms.narrativeSummarizer;
		const provider = this.llmRegistry.getProvider(providerName);
		const toolResults: Record<string, Record<string, unknown>> = {};

		const stream = provider.stream({
			model,
			maxTokens: 4096,
			system: NARRATIVE_SUMMARIZER_SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Candidate Narrative:\n${narrativeText}`,
				},
			],
			tools: [EXTRACT_NARRATIVE_SUMMARY_TOOL],
		});

		for await (const event of stream) {
			if (event.type === 'tool-use') {
				toolResults[event.name] = event.input;
			}
		}

		const rawSummary = toolResults['extract_narrative_summary'];

		if (!rawSummary) {
			throw new Error(
				`Claude did not return the extract_narrative_summary tool call`,
			);
		}

		const narrativeSummary = narrativeSummarySchema.parse(rawSummary);

		await this.profilesService.updateNarrativeSummary(
			uid,
			narrativeSummary,
		);

		this.eventBus.publish(
			new ProfileNarrativeSummaryCompletedEvent(String(job.id), uid),
		);
	}
}
