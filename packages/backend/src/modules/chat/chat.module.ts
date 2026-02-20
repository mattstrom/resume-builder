import { Module } from '@nestjs/common';

import { EntitiesModule } from '../entities/entities.module';
import { ChatController } from './chat.controller';

@Module({
	imports: [EntitiesModule],
	controllers: [ChatController],
})
export class ChatModule {}
