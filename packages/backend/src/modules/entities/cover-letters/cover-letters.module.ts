import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoverLetter, CoverLetterSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
import { CoverLettersResolver } from './cover-letters.resolver';
import { CoverLettersService } from './cover-letters.service';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([
			{ name: CoverLetter.name, schema: CoverLetterSchema },
		]),
	],
	providers: [CoverLettersResolver, CoverLettersService],
	exports: [CoverLettersService],
})
export class CoverLettersModule {}
