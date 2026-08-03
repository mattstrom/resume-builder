import { McpModule as NestMcpModule } from '@nestjs-mcp/server';
import { Module } from '@nestjs/common';

import { ConceptsModule } from '../concepts/concepts.module.js';
import { CrdtClientModule } from '../crdt-client/crdt-client.module.js';
import { EntitiesModule } from '../entities/index.js';
import { FactsModule } from '../facts/facts.module.js';
import { JobRequirementsModule } from '../job-requirements/job-requirements.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { ApplicationsResolver } from './applications.resolver.js';
import { BulletsResolver } from './bullets.resolver.js';
import { ConceptsResolver } from './concepts.resolver.js';
import { FactsResolver } from './facts.resolver.js';
import { HealthResolver } from './health.resolver.js';
import { JobRequirementsResolver } from './job-requirements.resolver.js';
import { NarrativeEditorResolver } from './narrative-editor.resolver.js';
import { ProfileResolver } from './profile.resolver.js';
import { FitAssessorPromptResolver } from './prompts/fit-assessor.resolver.js';
import { ResumesResolver } from './resumes.resolver.js';
import { SchemasResolver } from './schemas.resolver.js';

@Module({
	imports: [
		NestMcpModule.forRoot({
			name: 'resume-builder',
			version: '1.0.0',
			logging: {
				level: 'log',
			},
			transports: {
				streamable: { enabled: true },
			},
		}),
		EntitiesModule,
		CrdtClientModule,
		ConceptsModule,
		FactsModule,
		JobRequirementsModule,
		EmbeddingsModule,
		LlmModule,
	],
	exports: [NestMcpModule],
	providers: [
		ApplicationsResolver,
		BulletsResolver,
		ConceptsResolver,
		FactsResolver,
		JobRequirementsResolver,
		FitAssessorPromptResolver,
		HealthResolver,
		NarrativeEditorResolver,
		ProfileResolver,
		ResumesResolver,
		SchemasResolver,
	],
})
export class McpModule {}
