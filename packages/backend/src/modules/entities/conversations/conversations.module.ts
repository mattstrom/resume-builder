import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
	],
	controllers: [ConversationsController],
	providers: [ConversationsService],
	exports: [ConversationsService],
})
export class ConversationsModule {}
