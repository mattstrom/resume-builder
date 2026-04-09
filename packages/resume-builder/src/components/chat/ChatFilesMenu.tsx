import {
	Attachment,
	type AttachmentData,
	AttachmentInfo,
	AttachmentPreview,
	AttachmentRemove,
} from '@/components/ai-elements/attachments.tsx';
import type { SourceDocumentUIPart } from 'ai';
import { GlobeIcon } from 'lucide-react';
import { useCallback, type FC, memo } from 'react';
import {
	PromptInputCommand,
	PromptInputCommandEmpty,
	PromptInputCommandGroup,
	PromptInputCommandInput,
	PromptInputCommandItem,
	PromptInputCommandList,
	PromptInputCommandSeparator,
	usePromptInputReferencedSources,
} from '../ai-elements/prompt-input';

interface ChatFilesMenuProps {}

export const ChatFilesMenu: FC<ChatFilesMenuProps> = () => {
	const refs = usePromptInputReferencedSources();

	const handleAdd = useCallback(
		(source: SourceDocumentUIPart) => refs.add(source),
		[refs],
	);

	return (
		<PromptInputCommand>
			<PromptInputCommandInput
				className="border-none focus-visible:ring-0"
				placeholder="Add files, folders, docs..."
			/>
			<PromptInputCommandList>
				<PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
					No results found.
				</PromptInputCommandEmpty>
				<PromptInputCommandGroup heading="Added">
					<PromptInputCommandItem>
						<GlobeIcon />
						<span>Active Tabs</span>
						<span className="ml-auto text-muted-foreground">✓</span>
					</PromptInputCommandItem>
				</PromptInputCommandGroup>
				<PromptInputCommandSeparator />
				<PromptInputCommandGroup heading="Other Files">
					{sampleSources
						.filter(
							(source) =>
								!refs.sources.some(
									(s) =>
										s.title === source.title &&
										s.filename === source.filename,
								),
						)
						.map((source) => (
							<SourceCommandItem
								key={`${source.filename}-${source.title}`}
								onAdd={handleAdd}
								source={source}
							/>
						))}
				</PromptInputCommandGroup>
			</PromptInputCommandList>
		</PromptInputCommand>
	);
};

interface SourceItemProps {
	source: AttachmentData;
	onRemove: (id: string) => void;
}

const SourceItem = memo(({ source, onRemove }: SourceItemProps) => {
	const handleRemove = useCallback(
		() => onRemove(source.id),
		[onRemove, source.id],
	);
	return (
		<Attachment data={source} key={source.id} onRemove={handleRemove}>
			<AttachmentPreview />
			<AttachmentInfo />
			<AttachmentRemove />
		</Attachment>
	);
});

SourceItem.displayName = 'SourceItem';

interface SourceCommandItemProps {
	source: SourceDocumentUIPart;
	onAdd: (source: SourceDocumentUIPart) => void;
}

const SourceCommandItem = memo(({ source, onAdd }: SourceCommandItemProps) => {
	const handleSelect = useCallback(() => onAdd(source), [onAdd, source]);
	return (
		<PromptInputCommandItem
			key={`${source.filename}-${source.title}`}
			onSelect={handleSelect}
		>
			<GlobeIcon className="text-primary" />
			<div className="flex flex-col">
				<span className="font-medium text-sm">{source.title}</span>
				<span className="text-muted-foreground text-xs">
					{source.filename}
				</span>
			</div>
		</PromptInputCommandItem>
	);
});

SourceCommandItem.displayName = 'SourceCommandItem';

const sampleSources: SourceDocumentUIPart[] = [
	{
		filename: 'packages/elements/src',
		mediaType: 'text/plain',
		sourceId: '1',
		title: 'prompt-input.tsx',
		type: 'source-document',
	},
	{
		filename: 'apps/test/app/examples',
		mediaType: 'text/plain',
		sourceId: '2',
		title: 'queue.tsx',
		type: 'source-document',
	},
	{
		filename: 'packages/elements/src',
		mediaType: 'text/plain',
		sourceId: '3',
		title: 'queue.tsx',
		type: 'source-document',
	},
];
