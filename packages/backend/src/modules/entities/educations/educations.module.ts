import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Education, EducationSchema } from '@resume-builder/entities';
import { EducationsController } from './educations.controller';
import { EducationsResolver } from './educations.resolver';
import { EducationsService } from './educations.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Education.name, schema: EducationSchema },
		]),
	],
	controllers: [EducationsController],
	providers: [EducationsService, EducationsResolver],
	exports: [EducationsService],
})
export class EducationsModule {}
