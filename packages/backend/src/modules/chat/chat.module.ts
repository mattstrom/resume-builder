import { Module } from '@nestjs/common';

import { CrdtClientModule } from '../crdt-client/crdt-client.module';
import { EntitiesModule } from '../entities/entities.module';
import { LlmModule } from '../llm/llm.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
	imports: [EntitiesModule, LlmModule, CrdtClientModule],
	controllers: [ChatController],
	providers: [ChatService],
})
export class ChatModule {}
