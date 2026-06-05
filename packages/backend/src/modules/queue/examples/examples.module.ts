import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QUEUES } from '../queues.js';
import { PingCompletedEventHandler } from './ping-completed.event-handler.js';
import { PingCommandHandler } from './ping.command-handler.js';
import { PingController } from './ping.controller.js';
import { PingProcessor } from './ping.processor.js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Example pipeline that exercises the full Command → Queue → Processor →
 * Event flow. This exists as a template for real workloads — delete it
 * once the first real job (e.g. PDF generation) is migrated, or keep it
 * around as a reference / smoke test.
 */
@Module({
	imports: [
		BullModule.registerQueue({ name: QUEUES.PING }),
		...(isProd
			? []
			: [
					BullBoardModule.forFeature({
						name: QUEUES.PING,
						adapter: BullMQAdapter,
					}),
				]),
	],
	controllers: [PingController],
	providers: [PingCommandHandler, PingProcessor, PingCompletedEventHandler],
})
export class ExamplesModule {}
