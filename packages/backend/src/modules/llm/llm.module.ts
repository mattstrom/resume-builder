import { Module, OnModuleInit } from '@nestjs/common';

import { LlmProviderRegistry } from './llm-provider-registry.service';
import { AnthropicProviderService } from './providers/anthropic-provider.service';
import { OllamaProviderService } from './providers/ollama-provider.service';
import { LmStudioProviderService } from './providers/lm-studio-provider.service';

import configuration from '../../configuration';

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
