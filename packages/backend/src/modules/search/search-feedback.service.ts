import { BadRequestException, Injectable } from '@nestjs/common';
import { agentSearchResultTypeSchema } from '@resume-builder/entities';
import { z } from 'zod';

import { PrismaService } from '../prisma/index.js';

const feedbackSchema = z.object({
	searchRunId: z.string().trim().min(1).max(200),
	query: z.string().trim().min(2).max(2000),
	resultId: z.string().trim().min(1).max(500),
	resultType: agentSearchResultTypeSchema,
	rank: z.number().int().min(0).max(49),
	agentScore: z.number().min(0).max(1),
	relevant: z.boolean(),
});

export type SearchFeedbackInput = z.infer<typeof feedbackSchema>;

@Injectable()
export class SearchFeedbackService {
	constructor(private readonly prisma: PrismaService) {}

	async upsert(uid: string, input: SearchFeedbackInput) {
		const parsed = feedbackSchema.safeParse(input);
		if (!parsed.success) {
			throw new BadRequestException('Invalid search-result feedback');
		}

		const data = parsed.data;
		return this.prisma.searchResultFeedback.upsert({
			where: {
				uid_searchRunId_resultId: {
					uid,
					searchRunId: data.searchRunId,
					resultId: data.resultId,
				},
			},
			create: { uid, ...data },
			update: {
				query: data.query,
				resultType: data.resultType,
				rank: data.rank,
				agentScore: data.agentScore,
				relevant: data.relevant,
			},
		});
	}
}
