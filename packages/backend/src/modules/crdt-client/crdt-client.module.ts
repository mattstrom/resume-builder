import { Module } from '@nestjs/common';

import { CrdtApiService } from './crdt-api.service';
import { CrdtClientService } from './crdt-client.service';

@Module({
	providers: [CrdtClientService, CrdtApiService],
	exports: [CrdtClientService, CrdtApiService],
})
export class CrdtClientModule {}
