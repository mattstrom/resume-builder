import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import {
	BulletStatus,
	type EvidenceSelectionResult,
} from '@resume-builder/entities';

// Imported from the decorator module rather than the auth barrel: the barrel
// also loads the JWT strategy and auth controller, which drags a live Auth0
// dependency graph into anything that merely needs the param decorator.
import { CurrentUser } from '../auth/current-user.decorator.js';
import { EvidenceSelectionPayload } from './evidence-selection.graphql.js';
import {
	DEFAULT_EVIDENCE_BUDGET,
	EvidenceSelectionService,
} from './evidence-selection.service.js';

@Resolver()
export class EvidenceSelectionResolver {
	constructor(
		private readonly evidenceSelection: EvidenceSelectionService,
	) {}

	@Query(() => EvidenceSelectionPayload)
	async planResumeEvidence(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
		@Args('budget', {
			type: () => Int,
			nullable: true,
			defaultValue: DEFAULT_EVIDENCE_BUDGET,
		})
		budget: number,
		@Args('status', { type: () => BulletStatus, nullable: true })
		status?: BulletStatus,
	): Promise<EvidenceSelectionResult> {
		return this.evidenceSelection.planForApplication(
			uid,
			applicationId,
			budget,
			status,
		);
	}
}
