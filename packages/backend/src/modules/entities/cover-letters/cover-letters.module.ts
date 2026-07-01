import { Module } from '@nestjs/common';

import { CoverLettersResolver } from './cover-letters.resolver.js';
import { CoverLettersService } from './cover-letters.service.js';

@Module({
	providers: [CoverLettersResolver, CoverLettersService],
	exports: [CoverLettersService],
})
export class CoverLettersModule {}
