import { Global, Module, ModuleMetadata, Provider } from '@nestjs/common';
import config from '@/config';

import { RequestSigningService } from './request-signing.service';
import { RequestSigningKey } from './tokens';

const providers: Provider[] = [
	RequestSigningService,
	{
		provide: RequestSigningKey,
		useValue: config.crdt.internalKey,
	},
];

@Global()
@Module({
	providers,
	exports: providers,
})
export class RequestSigningModule {
	static forRoot(): ModuleMetadata {
		return {
			providers,
			exports: providers,
		};
	}
}
