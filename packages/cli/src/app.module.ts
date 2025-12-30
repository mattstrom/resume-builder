import 'reflect-metadata';

import type { Command } from '@cliffy/command';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

import { NotionService } from './services/notion.service.ts';
import { CommandToken, NotionClient } from './tokens.ts';
import configuration from './config/configuration.ts';
import { LookupService } from './services/lookup.service.ts';
import { BuildService } from './services/build.service.ts';
import { ResumeBuilder } from './services/resume.builder.ts';
import { SchemaService } from './services/schema.service.ts';

interface CommandConfig {
	command: Command;
}

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [configuration],
		}),
	],
	providers: [
		BuildService,
		LookupService,
		NotionService,
		ResumeBuilder,
		SchemaService,
		{
			provide: NotionClient,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) =>
				new Client({
					auth: configService.get('notion.apiToken'),
				}),
		},
	],
})
export class AppModule {
	static register({ command }: CommandConfig): DynamicModule {
		return {
			module: AppModule,
			providers: [{ provide: CommandToken, useValue: command }],
		};
	}
}
