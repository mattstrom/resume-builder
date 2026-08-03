import { observer } from 'mobx-react';
import { Fragment, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';
import type {
	DataGroup,
	DataSourceController,
} from '@/stores/data-sources/data-source-controller.ts';

export interface DataSourceItemSlotProps<T, G = string> {
	item: T;
	isSelected: boolean;
	select: () => void;
	controller: DataSourceController<T, G>;
}

export interface DataSourceGroupSlotProps<T, G = string> {
	group: DataGroup<T, G>;
	children: ReactNode;
	controller: DataSourceController<T, G>;
}

type ItemsProps = Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>;

export interface DataSourceViewProps<T, G = string> {
	controller: DataSourceController<T, G>;
	/** Default per-item rendering. Used unless `renderItemMaster` is also given. */
	renderItem?: (props: DataSourceItemSlotProps<T, G>) => ReactNode;
	/**
	 * Per-item rendering that takes priority over `renderItem` when given.
	 * Lets a master-list row (e.g. compact, selectable) differ from the
	 * standalone item rendering used elsewhere, independent of whether this
	 * view also owns a detail pane.
	 */
	renderItemMaster?: (props: DataSourceItemSlotProps<T, G>) => ReactNode;
	/** Providing this switches the view into a master/detail split. */
	renderItemDetail?: (item: T | null, controller: DataSourceController<T, G>) => ReactNode;
	/** Header rendered above a group's items by the default group wrapper. Ignored if `renderGroup` is overridden. */
	renderGroupHeader?: (
		group: DataGroup<T, G>,
		controller: DataSourceController<T, G>,
	) => ReactNode;
	/** Overrides the wrapper around a whole group (header + items). */
	renderGroup?: (props: DataSourceGroupSlotProps<T, G>) => ReactNode;
	emptyState?: ReactNode;
	className?: string;
	groupsClassName?: string;
	itemsClassName?: string;
	/** Extra DOM attributes (role, aria-label, ...) on each items wrapper div. */
	itemsProps?: ItemsProps;
	/** Master pane wrapper className, only used in master/detail mode. */
	masterClassName?: string;
	/** Detail pane wrapper className, only used in master/detail mode. */
	detailClassName?: string;
}

function DefaultGroupHeader<T, G>({ group }: { group: DataGroup<T, G> }) {
	return (
		<div className="flex items-center gap-2">
			<h2 className="text-base font-semibold capitalize text-foreground">{group.label}</h2>
			<span className="text-xs text-muted-foreground">{group.items.length}</span>
		</div>
	);
}

function DataSourceViewInner<T, G = string>(props: DataSourceViewProps<T, G>): ReactElement {
	const {
		controller,
		renderItem,
		renderItemMaster,
		renderItemDetail,
		renderGroupHeader,
		renderGroup,
		emptyState,
		className,
		groupsClassName,
		itemsClassName,
		itemsProps,
		masterClassName,
		detailClassName,
	} = props;

	const itemRenderer = renderItemMaster ?? renderItem;
	if (!itemRenderer) {
		throw new Error('DataSourceView requires renderItem or renderItemMaster.');
	}

	const items = controller.visibleItems;
	const groups = controller.groups;
	const hasDetailPane = Boolean(renderItemDetail);

	const selectedItem = hasDetailPane
		? (items.find((item) => controller.getId(item) === controller.selectedId) ?? null)
		: null;

	const renderItemSlot = (item: T) => {
		const id = controller.getId(item);

		return (
			<Fragment key={id}>
				{itemRenderer({
					item,
					isSelected: controller.isSelected(id),
					select: () => controller.select(id),
					controller,
				})}
			</Fragment>
		);
	};

	const renderGroupSlot = (group: DataGroup<T, G>) => {
		const children = (
			<div className={itemsClassName} {...itemsProps}>
				{group.items.map(renderItemSlot)}
			</div>
		);

		if (renderGroup) {
			return (
				<Fragment key={String(group.key)}>
					{renderGroup({ group, children, controller })}
				</Fragment>
			);
		}

		return (
			<section key={String(group.key)} className="flex flex-col gap-3">
				{renderGroupHeader ? (
					renderGroupHeader(group, controller)
				) : (
					<DefaultGroupHeader group={group} />
				)}
				{children}
			</section>
		);
	};

	const listContent =
		items.length === 0 ? (
			emptyState
		) : groups ? (
			<div className={cn('flex flex-col gap-8', groupsClassName)}>
				{groups.map(renderGroupSlot)}
			</div>
		) : (
			<div className={itemsClassName} {...itemsProps}>
				{items.map(renderItemSlot)}
			</div>
		);

	if (!hasDetailPane) {
		return <div className={className}>{listContent}</div>;
	}

	return (
		<div className={className ?? 'flex h-full min-h-0 gap-4'}>
			<div className={masterClassName ?? 'flex min-h-0 flex-1 flex-col overflow-y-auto'}>
				{listContent}
			</div>
			<div className={detailClassName ?? 'flex min-h-0 flex-1 flex-col overflow-y-auto'}>
				{renderItemDetail!(selectedItem, controller)}
			</div>
		</div>
	);
}

/**
 * Renders a `DataSourceController`'s items with customizable slots for
 * group wrappers, group headers, items, and (when a detail slot is given) a
 * master/detail split with selection wired to the controller.
 *
 * Generic components lose their type parameters when wrapped by `observer`,
 * since it types its result as a plain `FunctionComponent`; the cast below
 * restores them so callers still get a typed `T`/`G` at each call site.
 */
export const DataSourceView = observer(DataSourceViewInner) as typeof DataSourceViewInner;
