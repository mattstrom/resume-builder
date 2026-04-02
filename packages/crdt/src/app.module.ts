import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module.js';
import { LoggingModule } from './modules/logging/logging.module.js';
import { StorageModule } from './modules/storage/storage.module.js';

@Module({
	imports: [
		LoggingModule,
		MongooseModule.forRoot(
			process.env.MONGODB_URI ??
				'mongodb://localhost:27017/resume-builder',
		),
		AuthModule,
		StorageModule,
	],
})
export class AppModule {}
