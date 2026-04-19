import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import type { Config } from '@/config';

import { ExamplesModule } from './examples/examples.module';
import { JobAssessmentModule } from './job-assessment/job-assessment.module';

const isProd = process.env.NODE_ENV === 'production';

@Global()
@Module({
	imports: [
		CqrsModule,
		BullModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService<Config>) => {
				const url = configService.get('redis', { infer: true })?.url;
				return {
					connection: {
						// BullMQ accepts a full Redis URL via the `url` connection field
						// or host/port pairs. Using `url` keeps us in sync with config.
						url,
					},
				};
			},
		}),
		...(isProd
			? []
			: [
					BullBoardModule.forRoot({
						route: '/admin/queues',
						adapter: ExpressAdapter,
					}),
				]),
		ExamplesModule,
		JobAssessmentModule,
	],
	exports: [CqrsModule, BullModule],
})
export class QueueModule {}
