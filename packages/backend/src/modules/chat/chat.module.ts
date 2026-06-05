import { Module } from '@nestjs/common';

import { CrdtClientModule } from '../crdt-client/crdt-client.module.js';
import { EntitiesModule } from '../entities/entities.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
	imports: [EntitiesModule, LlmModule, CrdtClientModule],
	controllers: [ChatController],
	providers: [ChatService],
})
export class ChatModule {}
