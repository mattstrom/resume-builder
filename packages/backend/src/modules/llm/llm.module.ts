import { Module, OnModuleInit } from '@nestjs/common';

import configuration from '../../configuration.js';
import { LlmProviderRegistry } from './llm-provider-registry.service.js';
import { AnthropicProviderService } from './providers/anthropic-provider.service.js';
import { LmStudioProviderService } from './providers/lm-studio-provider.service.js';
import { OllamaProviderService } from './providers/ollama-provider.service.js';

@Module({
	providers: [
		LlmProviderRegistry,
		AnthropicProviderService,
		OllamaProviderService,
		LmStudioProviderService,
	],
	exports: [LlmProviderRegistry],
})
export class LlmModule implements OnModuleInit {
	constructor(
		private readonly registry: LlmProviderRegistry,
		private readonly anthropic: AnthropicProviderService,
		private readonly ollama: OllamaProviderService,
		private readonly lmStudio: LmStudioProviderService,
	) {}

	onModuleInit() {
		this.registry.register(this.anthropic);
		this.registry.register(this.ollama);
		this.registry.register(this.lmStudio);

		const defaultProvider = configuration.llms.defaultLlm.provider;
		if (defaultProvider) {
			this.registry.setDefaultProvider(defaultProvider);
		}
	}
}
