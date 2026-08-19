import { GripVertical, MoveDown, MoveUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

import { AddBlockButton, BlockOptionMenuItems } from './AddBlockButton.tsx';
import { blockTypes, blockTypesByName } from './block-types.ts';
import { getNumberedListOrdinal } from './blocks/NumberedListBlock.tsx';
import { SortableBlockList, type SortableBlockRenderProps } from './SortableBlockList.tsx';
import type { BlockInsertOption, BlockType, EditorBlock } from './types.ts';

export type { BlockInsertOption, BlockType, EditorBlock } from './types.ts';

interface BlockEditorProps {
	blocks: readonly EditorBlock[];
	onChange: (blockId: string, text: string) => void;
	onMove?: (fromIndex: number, toIndex: number) => void;
	onNestedMove?: (parentBlockId: string, fromIndex: number, toIndex: number) => void;
	onTypeChange?: (blockId: string, type: BlockType, schemaType?: string) => void;
	getInsertOptions?: (
		parentBlockId: string | undefined,
		index: number,
	) => readonly BlockInsertOption[];
	onInsert?: (
		parentBlockId: string | undefined,
		index: number,
		option: BlockInsertOption,
	) => void;
	parentBlockId?: string;
	className?: string;
	ariaLabel?: string;
}

function EditableBlock({
	block,
	onCommit,
	onTypeChange,
	getInsertOptions,
	onInsert,
	index,
	sortable,
	canDrag,
	numberedListOrdinal,
	children,
}: {
	block: EditorBlock;
	onCommit: (value: string) => void;
	onTypeChange?: (type: BlockType, schemaType?: string) => void;
	getInsertOptions?: (index: number) => readonly BlockInsertOption[];
	onInsert?: (index: number, option: BlockInsertOption) => void;
	index: number;
	sortable: SortableBlockRenderProps;
	canDrag: boolean;
	numberedListOrdinal: number;
	children?: ReactNode;
}) {
	const definition = blockTypesByName.get(block.type);
	if (!definition) return null;

	const Renderer = definition.component;
	const structuralOptions = (getInsertOptions?.(index) ?? []).filter(
		(option) => option.type === 'record' || option.type === 'section',
	);
	const turnIntoOptions: BlockInsertOption[] = [
		...blockTypes
			.filter(({ type }) => type !== 'record' && type !== 'section')
			.map(({ type, label }) => ({ id: type, type, label })),
		...structuralOptions,
	];

	return (
		<div
			className="group/block relative flex min-w-0 items-start gap-1 rounded-md py-1 pl-1 pr-2 hover:bg-muted/40 focus-within:bg-muted/40"
			data-block-id={block.id}
		>
			<div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/block:opacity-100 group-focus-within/block:opacity-100">
				{getInsertOptions && onInsert ? (
					<AddBlockButton
						blockLabel={(block.ariaLabel ?? block.text) || 'block'}
						getOptions={(position) =>
							getInsertOptions(position === 'before' ? index : index + 1)
						}
						onInsert={(position, option) =>
							onInsert(position === 'before' ? index : index + 1, option)
						}
					/>
				) : null}
				{canDrag || (onTypeChange && !block.readOnly) || block.schemaType ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7 text-muted-foreground"
								aria-label={`Open actions for ${block.ariaLabel ?? 'block'}`}
								title="Click for actions · Drag to reorder · Option/Alt + arrow keys"
								{...(canDrag ? sortable.dragHandleProps : {})}
							>
								<GripVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="min-w-56">
							<DropdownMenuGroup>
								<DropdownMenuLabel className="flex items-center gap-4">
									Block type
									<DropdownMenuShortcut>{definition.label}</DropdownMenuShortcut>
								</DropdownMenuLabel>
								{(block.type === 'record' || block.type === 'section') &&
								block.schemaType ? (
									<DropdownMenuLabel className="flex items-center gap-4">
										Schema type
										<DropdownMenuShortcut>
											{block.schemaLabel ?? block.schemaType}
										</DropdownMenuShortcut>
									</DropdownMenuLabel>
								) : null}
							</DropdownMenuGroup>
							{(onTypeChange && !block.readOnly) || canDrag ? (
								<DropdownMenuSeparator />
							) : null}
							{onTypeChange && !block.readOnly ? (
								<>
									<DropdownMenuLabel>Turn into</DropdownMenuLabel>
									<DropdownMenuGroup>
										<BlockOptionMenuItems
											options={turnIntoOptions}
											onSelect={(option) =>
												onTypeChange(
													option.type,
													option.type === 'record' ||
														option.type === 'section'
														? option.id
														: undefined,
												)
											}
										/>
									</DropdownMenuGroup>
								</>
							) : null}
							{canDrag ? (
								<>
									{onTypeChange && !block.readOnly ? (
										<DropdownMenuSeparator />
									) : null}
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
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
			<div className="flex min-w-0 flex-1 items-start">
				<Renderer
					block={block}
					onCommit={onCommit}
					numberedListOrdinal={numberedListOrdinal}
				>
					{children}
				</Renderer>
			</div>
		</div>
	);
}

export function BlockEditor({
	blocks,
	onChange,
	onMove,
	onNestedMove,
	onTypeChange,
	getInsertOptions,
	onInsert,
	parentBlockId,
	className,
	ariaLabel = 'Block editor',
}: BlockEditorProps) {
	const emptyInsertOptions = getInsertOptions?.(parentBlockId, 0) ?? [];

	return (
		<div className={className}>
			<SortableBlockList items={blocks} onMove={onMove} ariaLabel={ariaLabel}>
				{(block, index, sortable) => (
					<EditableBlock
						block={block}
						onCommit={(text) => onChange(block.id, text)}
						onTypeChange={
							onTypeChange
								? (type, schemaType) => onTypeChange(block.id, type, schemaType)
								: undefined
						}
						getInsertOptions={
							getInsertOptions
								? (slot) => getInsertOptions(parentBlockId, slot)
								: undefined
						}
						onInsert={
							onInsert
								? (slot, option) => onInsert(parentBlockId, slot, option)
								: undefined
						}
						index={index}
						sortable={sortable}
						canDrag={Boolean(onMove)}
						numberedListOrdinal={getNumberedListOrdinal(blocks, index)}
					>
						{block.children ? (
							<BlockEditor
								blocks={block.children}
								onChange={onChange}
								onMove={
									block.allowChildReorder && onNestedMove
										? (fromIndex, toIndex) =>
												onNestedMove(block.id, fromIndex, toIndex)
										: undefined
								}
								onNestedMove={onNestedMove}
								onTypeChange={onTypeChange}
								getInsertOptions={getInsertOptions}
								onInsert={onInsert}
								parentBlockId={block.id}
								ariaLabel={`${block.ariaLabel ?? block.text} blocks`}
							/>
						) : null}
					</EditableBlock>
				)}
			</SortableBlockList>
			{blocks.length === 0 && onInsert && getInsertOptions ? (
				<div className="px-1 py-1">
					<AddBlockButton
						blockLabel={ariaLabel}
						getOptions={() => emptyInsertOptions}
						onInsert={(_, option) => onInsert(parentBlockId, 0, option)}
					/>
				</div>
			) : null}
		</div>
	);
}
