import config from '@/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntitiesModule } from './modules/entities/entities.module';
import { McpModule } from './modules/mcp/mcp.module';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { PdfModule } from './modules/pdf/pdf.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [() => config],
		}),
		EntitiesModule,
		GraphQLModule,
		McpModule,
		MongooseModule.forRoot(config.mongodb.uri),
		PdfModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
