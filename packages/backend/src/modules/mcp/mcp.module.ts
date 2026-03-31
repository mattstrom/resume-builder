import { Module } from '@nestjs/common';

import { McpModule as NestMcpModule } from '@nestjs-mcp/server';
import { EntitiesModule } from '../entities/entities.module';
import { ApplicationsResolver } from './applications.resolver';
import { HealthResolver } from './health.resolver';
import { ResumesResolver } from './resumes.resolver';

@Module({
	imports: [
		NestMcpModule.forRoot({
			name: 'resume-builder',
			version: '1.0.0',
			logging: {
				level: 'warn',
			},
			transports: {
				streamable: { enabled: true },
			},
		}),
		EntitiesModule,
	],
	exports: [NestMcpModule],
	providers: [ApplicationsResolver, HealthResolver, ResumesResolver],
})
export class McpModule {}
