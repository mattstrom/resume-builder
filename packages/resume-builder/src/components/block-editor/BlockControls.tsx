import { ArrowDownToLine, ArrowUpToLine, GripVertical, Plus } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from '@/components/ui/button.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

import { blockTypesByName } from './block-types.ts';
import type { BlockInsertOption } from './types.ts';

export interface BlockControlsProps {
	actionsLabel: string;
	getInsertOptions: (position: 'before' | 'after') => readonly BlockInsertOption[];
	onInsert: (position: 'before' | 'after', option: BlockInsertOption) => void;
	dragHandleProps?: HTMLAttributes<HTMLElement>;
	children: ReactNode;
}

interface EmptyBlockInsertButtonProps {
	blockLabel: string;
	options: readonly BlockInsertOption[];
	onInsert: (option: BlockInsertOption) => void;
}

const containerTypes = ['record', 'section'] as const;

export function BlockOptionMenuItems({
	options,
	onSelect,
}: {
	options: readonly BlockInsertOption[];
	onSelect: (option: BlockInsertOption) => void;
}) {
	const direct = options.filter(
		(option) => !containerTypes.includes(option.type as (typeof containerTypes)[number]),
	);

	return (
		<>
			{direct.map((option) => {
				const Icon = blockTypesByName.get(option.type)?.icon;
				return (
					<DropdownMenuItem
						key={`${option.type}:${option.id}`}
						onSelect={() => onSelect(option)}
					>
						{Icon ? <Icon /> : null}
						{option.label}
					</DropdownMenuItem>
				);
			})}
			{containerTypes.map((type) => {
				const candidates = options.filter((option) => option.type === type);
				if (candidates.length === 0) return null;
				const definition = blockTypesByName.get(type);
				const Icon = definition?.icon;
				return (
					<DropdownMenuSub key={type}>
						<DropdownMenuSubTrigger>
							{Icon ? <Icon /> : null}
							{definition?.label}
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuGroup>
									{candidates.map((option) => (
										<DropdownMenuItem
											key={option.id}
											onSelect={() => onSelect(option)}
										>
											{option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuGroup>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
				);
			})}
		</>
	);
}

export function EmptyBlockInsertButton({
	blockLabel,
	options,
	onInsert,
}: EmptyBlockInsertButtonProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-7"
					disabled={options.length === 0}
					aria-label={`Add block to ${blockLabel}`}
					title={options.length === 0 ? 'No blocks can be added here' : 'Add block'}
				>
					<Plus />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>Add block</DropdownMenuLabel>
				<DropdownMenuGroup>
					<BlockOptionMenuItems options={options} onSelect={onInsert} />
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function BlockControls({
	actionsLabel,
	getInsertOptions,
	onInsert,
	dragHandleProps,
	children,
}: BlockControlsProps) {
	const canDrag = Boolean(dragHandleProps);
	const beforeOptions = getInsertOptions('before');
	const afterOptions = getInsertOptions('after');

	return (
		<div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/block:opacity-100 group-focus-within/block:opacity-100">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 text-muted-foreground"
						aria-label={`Open details and actions for ${actionsLabel}`}
						title={
							canDrag
								? 'Click for actions · Drag to reorder · Option/Alt + arrow keys'
								: 'Click for block details and actions'
						}
						{...dragHandleProps}
					>
						<GripVertical />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="min-w-56">
					<DropdownMenuGroup>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger disabled={beforeOptions.length === 0}>
								<ArrowUpToLine />
								Insert above
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuGroup>
										<BlockOptionMenuItems
											options={beforeOptions}
											onSelect={(option) => onInsert('before', option)}
										/>
									</DropdownMenuGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger disabled={afterOptions.length === 0}>
								<ArrowDownToLine />
								Insert below
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuGroup>
										<BlockOptionMenuItems
											options={afterOptions}
											onSelect={(option) => onInsert('after', option)}
										/>
									</DropdownMenuGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					{children}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
