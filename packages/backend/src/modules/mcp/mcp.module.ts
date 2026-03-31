import { Module } from '@nestjs/common';

import { McpModule as NestMcpModule } from '@nestjs-mcp/server';
import { EntitiesModule } from '../entities';
import { ApplicationsResolver } from './applications.resolver';
import { HealthResolver } from './health.resolver';
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
	],
	exports: [NestMcpModule],
	providers: [
		ApplicationsResolver,
		HealthResolver,
		ResumesResolver,
		SchemasResolver,
	],
})
export class McpModule {}
