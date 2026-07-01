import { Module } from '@nestjs/common';

import { ApiModule } from './modules/api/api.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LoggingModule } from './modules/logging/logging.module.js';
import { StorageModule } from './modules/storage/storage.module.js';

@Module({
	imports: [LoggingModule, AuthModule, ApiModule, StorageModule],
})
export class AppModule {}
