import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	evidenceGradeSchema,
	profileCuratorOutputSchema,
	profileKnowledgeProposalSchema,
} from '@resume-builder/entities';

import { type CreateFactDto, FactsService } from '../facts/facts.service.js';
import { PrismaService } from '../prisma/index.js';

@Injectable()
export class ProfileKnowledgeService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly factsService: FactsService,
	) {}

	async findFeedback(uid: string, applicationId: string) {
		return this.prisma.requirementGradeFeedback.findMany({
			where: { uid, applicationId },
			include: { proposals: { orderBy: { createdAt: 'asc' } } },
			orderBy: { createdAt: 'desc' },
		});
	}

	async findInbox(uid: string) {
		const proposals = await this.prisma.profileKnowledgeProposal.findMany({
			where: { uid, status: 'proposed' },
			include: {
				feedback: {
					include: {
						application: {
							select: { id: true, name: true, company: true },
						},
						jobRequirement: { select: { id: true, what: true } },
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return proposals.map(({ feedback, ...proposal }) => ({
			proposal,
			applicationId: feedback.application.id,
			applicationName: feedback.application.name,
			company: feedback.application.company,
			jobRequirementId: feedback.jobRequirement.id,
			requirement: feedback.jobRequirement.what,
			agentGrade: feedback.agentGrade,
			manualGrade: feedback.manualGrade,
			explanation: feedback.explanation,
		}));
	}

	async findLedger(uid: string) {
		const [proposals, pendingSuggestionCount] = await Promise.all([
			this.prisma.profileKnowledgeProposal.findMany({
				where: { uid, status: 'accepted' },
				include: {
					feedback: {
						include: {
							application: {
								select: { id: true, name: true, company: true },
							},
							jobRequirement: { select: { id: true, what: true } },
						},
					},
				},
				orderBy: { resolvedAt: 'desc' },
			}),
			this.prisma.profileKnowledgeProposal.count({
				where: { uid, status: 'proposed' },
			}),
		]);

		return {
			accepted: proposals.map(({ feedback, ...proposal }) => ({
				proposal,
				applicationId: feedback.application.id,
				applicationName: feedback.application.name,
				company: feedback.application.company,
				jobRequirementId: feedback.jobRequirement.id,
				requirement: feedback.jobRequirement.what,
				agentGrade: feedback.agentGrade,
				manualGrade: feedback.manualGrade,
				explanation: feedback.explanation,
			})),
			pendingSuggestionCount,
		};
	}

	async acceptedGuidance(uid: string): Promise<string[]> {
		const proposals = await this.prisma.profileKnowledgeProposal.findMany({
			where: {
				uid,
				status: 'accepted',
				kind: { in: ['requirement-interpretation', 'scoring-guidance'] },
			},
			select: { payload: true },
			orderBy: { createdAt: 'asc' },
		});

		return proposals.flatMap(({ payload }) => {
			const parsed = profileKnowledgeProposalSchema.safeParse(payload);
			return parsed.success && parsed.data.guidance ? [parsed.data.guidance] : [];
		});
	}

	async recordFeedback(
		uid: string,
		applicationId: string,
		jobRequirementId: string,
		agentGrade: string,
		manualGrade: string | null,
		explanation?: string | null,
	) {
		const parsedAgentGrade = evidenceGradeSchema.safeParse(agentGrade);
		const parsedManualGrade = manualGrade
			? evidenceGradeSchema.safeParse(manualGrade)
			: undefined;
		if (!parsedAgentGrade.success || (parsedManualGrade && !parsedManualGrade.success)) {
			throw new BadRequestException('Unknown evidence grade');
		}
		const normalizedExplanation = explanation?.trim() || null;
		if (normalizedExplanation && normalizedExplanation.length > 2000) {
			throw new BadRequestException('Feedback explanation is too long');
		}

		const requirement = await this.prisma.jobRequirementFact.findFirst({
			where: { id: jobRequirementId, applicationId, uid },
			select: { id: true },
		});
		if (!requirement) throw new NotFoundException('Job requirement not found');

		return this.prisma.requirementGradeFeedback.create({
			data: {
				uid,
				applicationId,
				jobRequirementId,
				agentGrade: parsedAgentGrade.data,
				manualGrade: parsedManualGrade?.data ?? null,
				explanation: normalizedExplanation,
			},
			include: { proposals: true },
		});
	}

	async saveProposals(uid: string, feedbackId: string, result: unknown) {
		const parsed = profileCuratorOutputSchema.safeParse(result);
		if (!parsed.success) throw new BadRequestException('Invalid curator proposals');
		const feedback = await this.prisma.requirementGradeFeedback.findFirst({
			where: { id: feedbackId, uid },
			select: { id: true },
		});
		if (!feedback) throw new NotFoundException('Grade feedback not found');

		return this.prisma.$transaction(
			parsed.data.proposals.map((proposal) =>
				this.prisma.profileKnowledgeProposal.create({
					data: {
						uid,
						feedbackId,
						kind: proposal.kind,
						title: proposal.title,
						rationale: proposal.rationale,
						payload: proposal,
					},
				}),
			),
		);
	}

	async resolveProposal(uid: string, proposalId: string, accept: boolean) {
		const proposal = await this.prisma.profileKnowledgeProposal.findFirst({
			where: { id: proposalId, uid },
		});
		if (!proposal) throw new NotFoundException('Knowledge proposal not found');
		if (proposal.status !== 'proposed') {
			throw new BadRequestException('Knowledge proposal has already been resolved');
		}

		let acceptedFactId: string | null = null;
		if (accept && proposal.kind === 'fact') {
			const parsed = profileKnowledgeProposalSchema.parse(proposal.payload);
			const fact = parsed.fact;
			if (!fact) throw new BadRequestException('Fact proposal payload is missing');
			const existing = await this.prisma.fact.findFirst({
				where: { uid, what: fact.what },
				select: { id: true },
			});
			if (existing) {
				acceptedFactId = existing.id;
			} else {
				const created = await this.factsService.create(uid, {
					what: fact.what,
					impact: fact.impact ?? undefined,
					scale: fact.scale ?? undefined,
					meanings: fact.meanings as CreateFactDto['meanings'],
				});
				acceptedFactId = created.id;
			}
		}

		return this.prisma.profileKnowledgeProposal.update({
			where: { id: proposal.id },
			data: {
				status: accept ? 'accepted' : 'rejected',
				acceptedFactId,
				resolvedAt: new Date(),
			},
		});
	}
}
