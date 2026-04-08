import { Injectable } from '@nestjs/common';

import type { LlmProvider } from './interfaces/llm-provider.interface';

@Injectable()
export class LlmProviderRegistry {
	private providers = new Map<string, LlmProvider>();
	private defaultProviderName = 'anthropic';

	register(provider: LlmProvider): void {
		this.providers.set(provider.name, provider);
	}

	getProvider(name: string): LlmProvider {
		const provider = this.providers.get(name);
		if (!provider) {
			throw new Error(`LLM provider "${name}" not registered`);
		}
		return provider;
	}

	getDefaultProvider(): LlmProvider {
		return this.getProvider(this.defaultProviderName);
	}

	setDefaultProvider(name: string): void {
		this.defaultProviderName = name;
	}
}
