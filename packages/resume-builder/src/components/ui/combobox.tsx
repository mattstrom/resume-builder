import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button.tsx';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';

export interface ComboboxOption {
	value: string;
	label: string;
	description?: string;
}

export interface ComboboxProps {
	options: readonly ComboboxOption[];
	value: string;
	selectedValue?: string;
	onValueChange: (value: string, option?: ComboboxOption) => void;
	placeholder: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	loadingMessage?: string;
	groupLabel?: string;
	isLoading?: boolean;
	disabled?: boolean;
	shouldFilter?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	ariaLabel?: string;
	ariaLabelledby?: string;
	className?: string;
}

export function Combobox({
	options,
	value,
	selectedValue,
	onValueChange,
	placeholder,
	searchPlaceholder = 'Search…',
	emptyMessage = 'No matches found.',
	loadingMessage = 'Loading…',
	groupLabel,
	isLoading = false,
	disabled = false,
	shouldFilter = true,
	open: controlledOpen,
	onOpenChange,
	ariaLabel,
	ariaLabelledby,
	className,
}: ComboboxProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
	const open = controlledOpen ?? uncontrolledOpen;

	const setOpen = (nextOpen: boolean) => {
		if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
		onOpenChange?.(nextOpen);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label={ariaLabelledby ? undefined : (ariaLabel ?? placeholder)}
					aria-labelledby={ariaLabelledby}
					disabled={disabled}
					className={cn('w-full justify-between', className)}
				>
					{value || placeholder}
					<ChevronsUpDown data-icon="inline-end" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
				<Command shouldFilter={shouldFilter}>
					<CommandInput
						value={value}
						onValueChange={(nextValue) => onValueChange(nextValue)}
						placeholder={searchPlaceholder}
						disabled={disabled}
					/>
					<CommandList>
						<CommandEmpty>{isLoading ? loadingMessage : emptyMessage}</CommandEmpty>
						<CommandGroup heading={groupLabel}>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={() => {
										onValueChange(option.label, option);
										setOpen(false);
									}}
								>
									{selectedValue === option.value && <Check />}
									<span className="flex flex-col">
										{option.label}
										{option.description && (
											<span className="text-xs text-muted-foreground">
												{option.description}
											</span>
										)}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
