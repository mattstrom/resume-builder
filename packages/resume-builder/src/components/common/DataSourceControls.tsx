import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { observer } from 'mobx-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { cn } from '@/lib/utils.ts';
import type { DataSourceController } from '@/stores/data-sources/data-source-controller.ts';

const UNSORTED = '__unsorted__';
const UNGROUPED = '__ungrouped__';

export interface DataSourceControlsProps<T, G = string> {
	controller: DataSourceController<T, G>;
	className?: string;
	showSearch?: boolean;
	searchPlaceholder?: string;
	searchAriaLabel?: string;
	showSort?: boolean;
	sortAriaLabel?: string;
	/** Adds an "Unsorted" option so a chosen sort can be cleared. Off by default. */
	allowUnsorted?: boolean;
	showGrouping?: boolean;
	groupingAriaLabel?: string;
	ungroupedLabel?: string;
	showFilters?: boolean;
}

function DataSourceControlsInner<T, G = string>(
	props: DataSourceControlsProps<T, G>,
): ReactElement | null {
	const {
		controller,
		className,
		showSearch = controller.hasSearch,
		searchPlaceholder = 'Search',
		searchAriaLabel = 'Search',
		showSort = controller.sorts.length > 0,
		sortAriaLabel = 'Sort by',
		allowUnsorted = false,
		showGrouping = controller.groupings.length > 0,
		groupingAriaLabel = 'Group by',
		ungroupedLabel = 'No grouping',
		showFilters = controller.filters.length > 0,
	} = props;

	if (!showSearch && !showSort && !showGrouping && !showFilters) {
		return null;
	}

	return (
		<div className={cn('flex flex-wrap items-center gap-3', className)}>
			{showSearch && (
				<InputGroup className="max-w-sm">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						aria-label={searchAriaLabel}
						placeholder={searchPlaceholder}
						value={controller.searchQuery}
						onChange={(event) => controller.setSearchQuery(event.target.value)}
					/>
				</InputGroup>
			)}

			{showSort && (
				<ButtonGroup>
					<Select
						value={controller.sortKey ?? UNSORTED}
						onValueChange={(value) => controller.setSort(value === UNSORTED ? null : value)}
					>
						<SelectTrigger aria-label={sortAriaLabel} className="w-40">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{allowUnsorted && <SelectItem value={UNSORTED}>Unsorted</SelectItem>}
								{controller.sorts.map((sort) => (
									<SelectItem key={sort.key} value={sort.key}>
										{sort.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={!controller.sortKey}
						onClick={() => controller.toggleSortDirection()}
						aria-label={
							controller.sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'
						}
						title={controller.sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
					>
						{controller.sortDirection === 'asc' ? <ArrowUp /> : <ArrowDown />}
					</Button>
				</ButtonGroup>
			)}

			{showGrouping && (
				<Select
					value={controller.groupingKey ?? UNGROUPED}
					onValueChange={(value) => controller.setGrouping(value === UNGROUPED ? null : value)}
				>
					<SelectTrigger aria-label={groupingAriaLabel} className="w-40">
						<SelectValue placeholder="Group by" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value={UNGROUPED}>{ungroupedLabel}</SelectItem>
							{controller.groupings.map((grouping) => (
								<SelectItem key={grouping.key} value={grouping.key}>
									{grouping.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			)}

			{showFilters && (
				<div className="flex flex-wrap items-center gap-1.5">
					{controller.filters.map((filter) => {
						const active = controller.isFilterActive(filter.key);
						return (
							<Button
								key={filter.key}
								type="button"
								variant={active ? 'default' : 'outline'}
								size="sm"
								aria-pressed={active}
								onClick={() => controller.setFilterActive(filter.key, !active)}
							>
								{filter.label}
							</Button>
						);
					})}
				</div>
			)}
		</div>
	);
}

/**
 * Toolbar for a `DataSourceController`: search, sort, group-by, and filter
 * chips, all derived from what the controller was configured with (sorts,
 * filters, groupings, whether a `searchPredicate` was given) — sections
 * hide themselves automatically when the controller has nothing to offer
 * for them. Same generic-preserving `observer` cast as `DataSourceView`.
 */
export const DataSourceControls = observer(DataSourceControlsInner) as typeof DataSourceControlsInner;
