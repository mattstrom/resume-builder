import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector.tsx';
import { PromptInputButton } from '@/components/ai-elements/prompt-input.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import type { ChatModelOption } from '@resume-builder/entities';
import { CheckIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { type FC, memo, useCallback, useState } from 'react';

export const ChatModelSelector: FC = observer(() => {
	const { conversationService } = useStore();
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const selectedModel = conversationService.selectedModel;
	const selectedModelData = conversationService.activeModelOption;
	const modelGroups = conversationService.modelsByProvider;

	const handleModelSelect = useCallback(
		(model: ChatModelOption) => {
			conversationService.setSelectedModel({
				provider: model.provider,
				model: model.model,
			});
			setModelSelectorOpen(false);
		},
		[conversationService],
	);

	return (
		<ModelSelector
			onOpenChange={setModelSelectorOpen}
			open={modelSelectorOpen}
		>
			<ModelSelectorTrigger asChild>
				<PromptInputButton>
					{selectedModelData?.logoProvider && (
						<ModelSelectorLogo
							provider={selectedModelData.logoProvider}
						/>
					)}
					<ModelSelectorName>
						{selectedModelData?.label ?? 'Select model'}
					</ModelSelectorName>
				</PromptInputButton>
			</ModelSelectorTrigger>
			<ModelSelectorContent>
				<ModelSelectorInput placeholder="Search models..." />
				<ModelSelectorList>
					<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
					{modelGroups.map((group) => (
						<ModelSelectorGroup
							heading={group.providerLabel}
							key={group.providerLabel}
						>
							{group.models.map((model) => (
								<ModelItem
									key={`${model.provider}:${model.model}`}
									model={model}
									onSelect={handleModelSelect}
									selectedModel={selectedModel}
								/>
							))}
						</ModelSelectorGroup>
					))}
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelector>
	);
});

interface ModelItemProps {
	model: ChatModelOption;
	selectedModel: {
		provider: string;
		model: string;
	} | null;
	onSelect: (model: ChatModelOption) => void;
}

const ModelItem = memo(({ model, selectedModel, onSelect }: ModelItemProps) => {
	const handleSelect = useCallback(() => onSelect(model), [onSelect, model]);
	const isSelected =
		selectedModel?.provider === model.provider &&
		selectedModel.model === model.model;

	return (
		<ModelSelectorItem
			onSelect={handleSelect}
			value={`${model.provider} ${model.label} ${model.model}`}
		>
			{model.logoProvider && (
				<ModelSelectorLogo provider={model.logoProvider} />
			)}
			<ModelSelectorName>{model.label}</ModelSelectorName>
			{isSelected ? (
				<CheckIcon className="ml-auto size-4" />
			) : (
				<div className="ml-auto size-4" />
			)}
		</ModelSelectorItem>
	);
});

ModelItem.displayName = 'ModelItem';
