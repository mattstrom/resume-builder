import { Module } from '@nestjs/common';

import { ApiService } from './api.service.js';

@Module({
	providers: [ApiService],
	exports: [ApiService],
})
export class ApiModule {}
