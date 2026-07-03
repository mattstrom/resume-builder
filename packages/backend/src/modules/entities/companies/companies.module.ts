import { Module } from '@nestjs/common';

import { CompaniesResolver } from './companies.resolver.js';
import { CompaniesService } from './companies.service.js';

@Module({
	providers: [CompaniesService, CompaniesResolver],
	exports: [CompaniesService],
})
export class CompaniesModule {}
