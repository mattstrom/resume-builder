import { Module } from '@nestjs/common';

import { ConceptEvidenceAssessmentsResolver } from './concept-evidence-assessments.resolver.js';
import { ConceptEvidenceAssessmentsService } from './concept-evidence-assessments.service.js';

@Module({
	providers: [
		ConceptEvidenceAssessmentsResolver,
		ConceptEvidenceAssessmentsService,
	],
})
export class ConceptEvidenceAssessmentsModule {}
