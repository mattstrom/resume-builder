import { Module } from '@nestjs/common';

import { McpModule as NestMcpModule } from '@nestjs-mcp/server';
import { MongodbModule } from '../mongodb/mongodb.module';
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
		}),
		MongodbModule,
	],
	exports: [NestMcpModule],
	providers: [HealthResolver, ResumesResolver],
})
export class McpModule {}
