import { Module } from '@nestjs/common';

import { CrdtApiService } from './crdt-api.service.js';
import { CrdtClientService } from './crdt-client.service.js';

@Module({
	providers: [CrdtClientService, CrdtApiService],
	exports: [CrdtClientService, CrdtApiService],
})
export class CrdtClientModule {}
