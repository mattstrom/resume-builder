import config from '@/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BackupModule } from './modules/backup/backup.module';
import { ChatModule } from './modules/chat/chat.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './modules/logging/logging.module';
import { McpModule } from './modules/mcp/mcp.module';
import { PdfModule } from './modules/pdf/pdf.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => config],
		}),
		BackupModule,
		ChatModule,
		EntitiesModule,
		GraphQLModule,
		HealthModule,
		McpModule,
		MongooseModule.forRoot(config.mongodb.uri),
		PdfModule,
		LoggingModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
