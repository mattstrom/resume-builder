import { Module } from '@nestjs/common';

import { CrdtClientService } from './crdt-client.service';

@Module({
	providers: [CrdtClientService],
	exports: [CrdtClientService],
})
export class CrdtClientModule {}
