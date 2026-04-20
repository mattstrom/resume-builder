import { Module } from '@nestjs/common';

import { McpModule as NestMcpModule } from '@nestjs-mcp/server';
import { CrdtClientModule } from '../crdt-client/crdt-client.module';
import { EntitiesModule } from '../entities';
import { ApplicationsResolver } from './applications.resolver';
import { HealthResolver } from './health.resolver';
import { NarrativeEditorResolver } from './narrative-editor.resolver';
import { FitAssessorPromptResolver } from './prompts/fit-assessor.resolver';
import { ProfileResolver } from './profile.resolver';
import { ResumesResolver } from './resumes.resolver';
import { SchemasResolver } from './schemas.resolver';

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
	],
	exports: [NestMcpModule],
	providers: [
		ApplicationsResolver,
		FitAssessorPromptResolver,
		HealthResolver,
		NarrativeEditorResolver,
		ProfileResolver,
		ResumesResolver,
		SchemasResolver,
	],
})
export class McpModule {}
