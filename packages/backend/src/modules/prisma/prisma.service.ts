import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import type { Config } from '../../configuration.js';
import { PrismaClient } from '../../generated/prisma/client.js';

const SCHEMA = 'resume_builder';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor(configService: ConfigService<Config>) {
		const connectionString = configService.get<string>('postgres.url', {
			infer: true,
		})!;
		const adapter = new PrismaPg(connectionString, { schema: SCHEMA });
		super({ adapter });
	}

	async onModuleInit(): Promise<void> {
		await this.$connect();
	}

	async onModuleDestroy(): Promise<void> {
		await this.$disconnect();
	}
}
