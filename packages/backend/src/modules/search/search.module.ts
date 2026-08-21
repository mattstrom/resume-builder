import { Module } from '@nestjs/common';

import { ConceptsModule } from '../concepts/concepts.module.js';
import { BulletsModule } from '../entities/bullets/bullets.module.js';
import { ResumesModule } from '../entities/resumes/resumes.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { AdvancedSearchResolver } from './advanced-search.resolver.js';
import { AdvancedSearchService } from './advanced-search.service.js';

@Module({
	imports: [ResumesModule, BulletsModule, ConceptsModule, EmbeddingsModule],
	providers: [AdvancedSearchResolver, AdvancedSearchService],
	exports: [AdvancedSearchService],
})
export class SearchModule {}
