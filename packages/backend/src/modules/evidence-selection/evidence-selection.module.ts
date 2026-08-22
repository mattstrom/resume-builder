import { Module } from '@nestjs/common';

import { ConceptsModule } from '../concepts/concepts.module.js';
import { BulletsModule } from '../entities/bullets/bullets.module.js';
import { JobRequirementsModule } from '../job-requirements/job-requirements.module.js';
import { EvidenceSelectionResolver } from './evidence-selection.resolver.js';
import { EvidenceSelectionService } from './evidence-selection.service.js';

@Module({
	imports: [JobRequirementsModule, BulletsModule, ConceptsModule],
	providers: [EvidenceSelectionResolver, EvidenceSelectionService],
	exports: [EvidenceSelectionService],
})
export class EvidenceSelectionModule {}
