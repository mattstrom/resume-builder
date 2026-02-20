import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '@resume-builder/entities';

import { ChatController } from './chat.controller';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Resume.name, schema: ResumeSchema },
		]),
	],
	controllers: [ChatController],
})
export class ChatModule {}
