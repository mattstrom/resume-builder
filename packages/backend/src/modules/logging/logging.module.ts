import { Module, Provider } from '@nestjs/common';
import { Logger } from 'winston';
import { logger } from './winston';

const providers: Provider[] = [{ provide: Logger, useValue: logger }];

@Module({
	providers,
	exports: providers,
})
export class LoggingModule {}
