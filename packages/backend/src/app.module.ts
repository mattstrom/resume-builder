import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import config from './configuration.js';
import { AuthModule } from './modules/auth/index.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { EntitiesModule } from './modules/entities/entities.module.js';
import { FactsModule } from './modules/facts/facts.module.js';
import { GraphQLModule } from './modules/graphql/graphql.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LlmModule } from './modules/llm/llm.module.js';
import { LoggingModule } from './modules/logging/logging.module.js';
import { McpModule } from './modules/mcp/mcp.module.js';
import { PdfModule } from './modules/pdf/pdf.module.js';
import { PrismaModule } from './modules/prisma/index.js';
import { QueueModule } from './modules/queue/queue.module.js';
import { RequestSigningModule } from './modules/request-signing/index.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => config],
		}),
		AuthModule,
		RequestSigningModule,
		QueueModule,
		ChatModule,
		EntitiesModule,
		FactsModule,
		GraphQLModule,
		HealthModule,
		McpModule,
		MongooseModule.forRoot(config.mongodb.uri),
		PrismaModule,
		PdfModule,
		LoggingModule,
		LlmModule,
	],
})
export class AppModule {}
