import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../prisma/index.js';

const evaluationSchema = z.object({
	evaluations: z.array(
		z.object({
			conceptId: z.string().trim().min(1),
			grade: z.enum(['strong', 'moderate', 'weak', 'missing']),
			score: z.number().min(0).max(1),
			evidenceItemIds: z.array(z.string().trim().min(1)).max(3),
			rationale: z.string().trim().min(1),
		}),
	),
	summary: z.string().trim().min(1),
});

@Injectable()
export class ConceptEvidenceAssessmentsService {
	constructor(private readonly prisma: PrismaService) {}

	async find(uid: string, applicationId: string, resumeId: string) {
		return this.prisma.conceptEvidenceAssessment.findFirst({
			where: { uid, applicationId, resumeId },
		});
	}

	async upsert(
		uid: string,
		applicationId: string,
		resumeId: string,
		inputHash: string,
		evaluatorVersion: number,
		result: unknown,
	) {
		if (!/^[a-f0-9]{64}$/.test(inputHash)) {
			throw new BadRequestException('inputHash must be a SHA-256 hex digest');
		}
		if (!Number.isInteger(evaluatorVersion) || evaluatorVersion < 1) {
			throw new BadRequestException('evaluatorVersion must be a positive integer');
		}

		const parsedResult = evaluationSchema.safeParse(result);
		if (!parsedResult.success) {
			throw new BadRequestException('Invalid concept evidence assessment result');
		}

		const [application, resume] = await Promise.all([
			this.prisma.application.findFirst({
				where: { id: applicationId, uid },
				select: { id: true },
			}),
			this.prisma.resume.findFirst({
				where: { id: resumeId, uid },
				select: { id: true, applicationId: true },
			}),
		]);
		if (!application || !resume || resume.applicationId !== applicationId) {
			throw new NotFoundException('Application resume not found');
		}

		return this.prisma.conceptEvidenceAssessment.upsert({
			where: {
				uid_applicationId_resumeId: { uid, applicationId, resumeId },
			},
			create: {
				uid,
				applicationId,
				resumeId,
				inputHash,
				evaluatorVersion,
				result: parsedResult.data,
			},
			update: {
				inputHash,
				evaluatorVersion,
				result: parsedResult.data,
			},
		});
	}
}
