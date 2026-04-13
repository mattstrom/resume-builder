import type {
	ChatModelOption,
	ChatModelSelection,
	ChatModelsResponse,
} from '@resume-builder/entities';

import configuration from '../../configuration';

type ConfiguredProvider = keyof typeof configuration.llms &
	('anthropic' | 'ollama' | 'lmStudio');

const PROVIDER_METADATA: Record<
	ConfiguredProvider,
	{
		provider: string;
		providerLabel: string;
		logoProvider: string;
	}
> = {
	anthropic: {
		provider: 'anthropic',
		providerLabel: 'Anthropic',
		logoProvider: 'anthropic',
	},
	ollama: {
		provider: 'ollama',
		providerLabel: 'Ollama',
		logoProvider: 'llama',
	},
	lmStudio: {
		provider: 'lm-studio',
		providerLabel: 'LM Studio',
		logoProvider: 'lmstudio',
	},
};

export function getChatModelCatalog(): ChatModelsResponse {
	const models = (
		Object.entries(PROVIDER_METADATA) as Array<
			[ConfiguredProvider, (typeof PROVIDER_METADATA)[ConfiguredProvider]]
		>
	).flatMap(([configKey, metadata]) =>
		configuration.llms[configKey].models.map(
			(model): ChatModelOption => ({
				provider: metadata.provider,
				providerLabel: metadata.providerLabel,
				model: model.name,
				label: model.label,
				logoProvider: metadata.logoProvider,
			}),
		),
	);

	return {
		models,
		defaultSelection: {
			provider: configuration.llms.defaultLlm.provider,
			model: configuration.llms.defaultLlm.model,
		},
	};
}

export function isConfiguredChatModel(
	selection: ChatModelSelection,
): boolean {
	return getChatModelCatalog().models.some(
		(model) =>
			model.provider === selection.provider &&
			model.model === selection.model,
	);
}
