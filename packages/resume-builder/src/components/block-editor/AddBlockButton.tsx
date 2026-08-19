import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

import { blockTypesByName } from './block-types.ts';
import type { BlockInsertOption } from './types.ts';

interface AddBlockButtonProps {
	blockLabel: string;
	getOptions: (position: 'before' | 'after') => readonly BlockInsertOption[];
	onInsert: (position: 'before' | 'after', option: BlockInsertOption) => void;
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
								{candidates.map((option) => (
									<DropdownMenuItem
										key={option.id}
										onSelect={() => onSelect(option)}
									>
										{option.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
				);
			})}
		</>
	);
}

export function AddBlockButton({ blockLabel, getOptions, onInsert }: AddBlockButtonProps) {
	const [position, setPosition] = useState<'before' | 'after'>('after');
	const options = getOptions(position);
	const disabled = getOptions('before').length === 0 && getOptions('after').length === 0;

	const choosePosition = (event: { altKey: boolean }) => {
		setPosition(event.altKey ? 'before' : 'after');
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-7"
					disabled={disabled}
					aria-label={`Add block after ${blockLabel}. Hold Option to add before.`}
					title={
						disabled
							? 'No blocks can be added here'
							: 'Add block · Hold Option to insert above'
					}
					onPointerDown={choosePosition}
					onClick={choosePosition}
				>
					<Plus />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>
					Add {position === 'before' ? 'above' : 'below'}
				</DropdownMenuLabel>
				<DropdownMenuGroup>
					<BlockOptionMenuItems
						options={options}
						onSelect={(option) => onInsert(position, option)}
					/>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
