import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorLogoGroup,
	ModelSelectorName,
	ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector.tsx';
import { PromptInputButton } from '@/components/ai-elements/prompt-input.tsx';
import { CheckIcon } from 'lucide-react';
import { type FC, memo, useCallback, useState } from 'react';

const models = [
	{
		chef: 'OpenAI',
		chefSlug: 'openai',
		id: 'gpt-4o',
		name: 'GPT-4o',
		providers: ['openai', 'azure'],
	},
	{
		chef: 'OpenAI',
		chefSlug: 'openai',
		id: 'gpt-4o-mini',
		name: 'GPT-4o Mini',
		providers: ['openai', 'azure'],
	},
	{
		chef: 'Anthropic',
		chefSlug: 'anthropic',
		id: 'claude-opus-4-20250514',
		name: 'Claude 4 Opus',
		providers: ['anthropic', 'azure', 'google', 'amazon-bedrock'],
	},
	{
		chef: 'Anthropic',
		chefSlug: 'anthropic',
		id: 'claude-sonnet-4-20250514',
		name: 'Claude 4 Sonnet',
		providers: ['anthropic', 'azure', 'google', 'amazon-bedrock'],
	},
	{
		chef: 'Google',
		chefSlug: 'google',
		id: 'gemini-2.0-flash-exp',
		name: 'Gemini 2.0 Flash',
		providers: ['google'],
	},
];

interface ChatModelSelectorProps {}

export const ChatModelSelector: FC<ChatModelSelectorProps> = () => {
	const [model, setModel] = useState<string>(models[0].id);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const selectedModelData = models.find((m) => m.id === model);

	const handleModelSelect = useCallback((id: string) => {
		setModel(id);
		setModelSelectorOpen(false);
	}, []);

	return (
		<ModelSelector
			onOpenChange={setModelSelectorOpen}
			open={modelSelectorOpen}
		>
			<ModelSelectorTrigger asChild>
				<PromptInputButton>
					{selectedModelData?.chefSlug && (
						<ModelSelectorLogo
							provider={selectedModelData.chefSlug}
						/>
					)}
					{selectedModelData?.name && (
						<ModelSelectorName>
							{selectedModelData.name}
						</ModelSelectorName>
					)}
				</PromptInputButton>
			</ModelSelectorTrigger>
			<ModelSelectorContent>
				<ModelSelectorInput placeholder="Search models..." />
				<ModelSelectorList>
					<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
					{['OpenAI', 'Anthropic', 'Google'].map((chef) => (
						<ModelSelectorGroup heading={chef} key={chef}>
							{models
								.filter((m) => m.chef === chef)
								.map((m) => (
									<ModelItem
										key={m.id}
										m={m}
										onSelect={handleModelSelect}
										selectedModel={model}
									/>
								))}
						</ModelSelectorGroup>
					))}
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelector>
	);
};

interface ModelItemProps {
	m: (typeof models)[0];
	selectedModel: string;
	onSelect: (id: string) => void;
}

const ModelItem = memo(({ m, selectedModel, onSelect }: ModelItemProps) => {
	const handleSelect = useCallback(() => onSelect(m.id), [onSelect, m.id]);
	return (
		<ModelSelectorItem key={m.id} onSelect={handleSelect} value={m.id}>
			<ModelSelectorLogo provider={m.chefSlug} />
			<ModelSelectorName>{m.name}</ModelSelectorName>
			<ModelSelectorLogoGroup>
				{m.providers.map((provider) => (
					<ModelSelectorLogo key={provider} provider={provider} />
				))}
			</ModelSelectorLogoGroup>
			{selectedModel === m.id ? (
				<CheckIcon className="ml-auto size-4" />
			) : (
				<div className="ml-auto size-4" />
			)}
		</ModelSelectorItem>
	);
});

ModelItem.displayName = 'ModelItem';
