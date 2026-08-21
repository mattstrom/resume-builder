import { Module } from '@nestjs/common';

import { ConceptsModule } from '../concepts/concepts.module.js';
import { CrdtClientModule } from '../crdt-client/crdt-client.module.js';
import { BulletsModule } from '../entities/bullets/bullets.module.js';
import { JobsModule } from '../entities/jobs/jobs.module.js';
import { ProjectsModule } from '../entities/projects/projects.module.js';
import { ResumesModule } from '../entities/resumes/resumes.module.js';
import { SkillsModule } from '../entities/skills/skills.module.js';
import { VolunteeringModule } from '../entities/volunteering/volunteering.module.js';
import { FactsModule } from '../facts/facts.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { AdvancedSearchResolver } from './advanced-search.resolver.js';
import { AdvancedSearchService } from './advanced-search.service.js';
import { AgentSearchService } from './agent-search.service.js';
import { SearchFeedbackService } from './search-feedback.service.js';

@Module({
	imports: [
		ResumesModule,
		BulletsModule,
		ConceptsModule,
		EmbeddingsModule,
		FactsModule,
		JobsModule,
		ProjectsModule,
		SkillsModule,
		VolunteeringModule,
		CrdtClientModule,
	],
	providers: [
		AdvancedSearchResolver,
		AdvancedSearchService,
		AgentSearchService,
		SearchFeedbackService,
	],
	exports: [AdvancedSearchService, AgentSearchService],
})
export class SearchModule {}
