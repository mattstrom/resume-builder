import { Global, Module, Provider } from '@nestjs/common';

import { logger } from './logger.js';
import { LoggingService } from './logging.service.js';
import { Logger } from './tokens.js';

const providers: Provider[] = [
	LoggingService,
	{ provide: Logger, useValue: logger },
];

@Global()
@Module({
	providers,
	exports: providers,
})
export class LoggingModule {}
