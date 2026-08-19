import { GripVertical, MoveDown, MoveUp } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

import { blockTypes, blockTypesByName } from './block-types.ts';
import { getNumberedListOrdinal } from './blocks/NumberedListBlock.tsx';
import { SortableBlockList, type SortableBlockRenderProps } from './SortableBlockList.tsx';
import type { BlockType, EditorBlock } from './types.ts';

export type { BlockType, EditorBlock } from './types.ts';

interface BlockEditorProps {
	blocks: readonly EditorBlock[];
	onChange: (blockId: string, text: string) => void;
	onMove?: (fromIndex: number, toIndex: number) => void;
	onTypeChange?: (blockId: string, type: BlockType) => void;
	className?: string;
	ariaLabel?: string;
}

function EditableBlock({
	block,
	onCommit,
	onTypeChange,
	sortable,
	canDrag,
	numberedListOrdinal,
}: {
	block: EditorBlock;
	onCommit: (value: string) => void;
	onTypeChange?: (type: BlockType) => void;
	sortable: SortableBlockRenderProps;
	canDrag: boolean;
	numberedListOrdinal: number;
}) {
	const definition = blockTypesByName.get(block.type);
	if (!definition) return null;

	const CurrentTypeIcon = definition.icon;
	const Renderer = definition.component;

	return (
		<div
			className="group/block relative flex min-w-0 items-start gap-1 rounded-md py-1 pl-1 pr-2 hover:bg-muted/40 focus-within:bg-muted/40"
			data-block-id={block.id}
		>
			<div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/block:opacity-100 group-focus-within/block:opacity-100">
				{canDrag ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 cursor-grab text-muted-foreground active:cursor-grabbing"
						aria-label={`Drag ${block.ariaLabel ?? 'block'} to reorder`}
						title="Drag to reorder · Option/Alt + arrow keys"
						{...sortable.dragHandleProps}
					>
						<GripVertical />
					</Button>
				) : null}
				{onTypeChange && !block.readOnly ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7 text-muted-foreground"
								aria-label={`Change ${block.ariaLabel ?? 'block'} type`}
							>
								<CurrentTypeIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuLabel>Turn into</DropdownMenuLabel>
							<DropdownMenuGroup>
								{blockTypes.map(({ type, label, icon: Icon }) => (
									<DropdownMenuItem
										key={type}
										onSelect={() => onTypeChange(type)}
									>
										<Icon />
										{label}
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem
									disabled={!sortable.canMoveBackward}
									onSelect={sortable.moveBackward}
								>
									<MoveUp /> Move up
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={!sortable.canMoveForward}
									onSelect={sortable.moveForward}
								>
									<MoveDown /> Move down
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
			<div className="flex min-w-0 flex-1 items-start">
				<Renderer
					block={block}
					onCommit={onCommit}
					numberedListOrdinal={numberedListOrdinal}
				/>
			</div>
		</div>
	);
}

export function BlockEditor({
	blocks,
	onChange,
	onMove,
	onTypeChange,
	className,
	ariaLabel = 'Block editor',
}: BlockEditorProps) {
	return (
		<SortableBlockList
			items={blocks}
			onMove={onMove}
			className={className}
			ariaLabel={ariaLabel}
		>
			{(block, index, sortable) => (
				<EditableBlock
					block={block}
					onCommit={(text) => onChange(block.id, text)}
					onTypeChange={onTypeChange ? (type) => onTypeChange(block.id, type) : undefined}
					sortable={sortable}
					canDrag={Boolean(onMove)}
					numberedListOrdinal={getNumberedListOrdinal(blocks, index)}
				/>
			)}
		</SortableBlockList>
	);
}
