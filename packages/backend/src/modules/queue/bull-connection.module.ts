import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { Config } from '../../configuration.js';

@Global()
@Module({
	imports: [
		BullModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService<Config>) => {
				const { url, password } = configService.get('redis', {
					infer: true,
				})!;

				let redisUrl = url;

				if (password) {
					const parsed = new URL(url);
					parsed.password = encodeURIComponent(password);
					redisUrl = parsed.toString();
				}

				return { connection: { url: redisUrl } };
			},
		}),
	],
	exports: [BullModule],
})
export class BullConnectionModule {}
