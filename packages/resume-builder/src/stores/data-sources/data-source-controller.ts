import { action, computed, makeObservable, observable, reaction } from 'mobx';

import type { PersistenceService } from '../services/persistence.service.ts';

export type SortDirection = 'asc' | 'desc';
export type SelectionMode = 'none' | 'single' | 'multi';
export type ExternalMatchMode = 'union' | 'intersect';

export interface SortDefinition<T> {
	key: string;
	label: string;
	compare: (a: T, b: T) => number;
}

export interface FilterDefinition<T> {
	key: string;
	label: string;
	predicate: (item: T) => boolean;
}

export interface GroupingDefinition<T, G> {
	key: string;
	label: string;
	groupOf: (item: T) => G;
	groupLabel?: (group: G) => string;
	compareGroups?: (a: G, b: G) => number;
}

export interface DataGroup<T, G> {
	key: G;
	label: string;
	items: T[];
}

export interface DataSourcePersistenceOptions {
	service: PersistenceService;
	/** Prefixes every persisted key, e.g. namespace "conceptsView" -> "conceptsView.sortKey". */
	namespace: string;
	/** Which concerns to persist across reloads. Search text is never persisted. */
	persist?: {
		sort?: boolean;
		grouping?: boolean;
		filters?: boolean;
		selection?: boolean;
	};
}

export interface DataSourceControllerOptions<T, G = string> {
	getId: (item: T) => string;
	searchPredicate?: (item: T, query: string) => boolean;
	sorts?: SortDefinition<T>[];
	defaultSortKey?: string | null;
	defaultSortDirection?: SortDirection;
	filters?: FilterDefinition<T>[];
	defaultActiveFilterKeys?: string[];
	groupings?: GroupingDefinition<T, G>[];
	defaultGroupingKey?: string | null;
	selectionMode?: SelectionMode;
	externalMatchMode?: ExternalMatchMode;
	persistence?: DataSourcePersistenceOptions;
}

/**
 * Owns the derived state (search/filter/sort/group/selection) for a list of
 * entities without dictating how those entities are fetched or rendered.
 * Generalizes the bespoke sort/group/pin logic in `ExplorerSidebarStore` so
 * other views (concepts, facts, bullets, ...) don't have to reinvent it with
 * scattered `useState`/`useMemo`.
 *
 * Items are pushed in via `setItems()` (an `@observable.ref`), not pulled
 * through a getter: a getter only participates in MobX's dependency
 * tracking when it happens to read MobX observables, so a source backed by
 * React state (Apollo `useQuery`, debounced search, ...) would silently go
 * stale — `visibleItems`/`groups` would stay cached at whatever they
 * computed to on the render that first read them. `useDataSourceController`
 * calls `setItems` once per render so the derived pipeline always reflects
 * the latest data regardless of where it came from.
 */
export class DataSourceController<T, G = string> {
	@observable searchQuery = '';
	@observable.shallow activeFilterKeys = new Set<string>();
	@observable sortKey: string | null;
	@observable sortDirection: SortDirection;
	@observable groupingKey: string | null;
	@observable.shallow selectedIds = new Set<string>();
	@observable.ref externalMatchIds: ReadonlySet<string> | null = null;
	@observable.ref private items: T[] = [];

	private readonly sortsByKey: Map<string, SortDefinition<T>>;
	private readonly filtersByKey: Map<string, FilterDefinition<T>>;
	private readonly groupingsByKey: Map<string, GroupingDefinition<T, G>>;
	private readonly externalMatchMode: ExternalMatchMode;
	private readonly disposers: (() => void)[] = [];

	constructor(private readonly options: DataSourceControllerOptions<T, G>) {
		makeObservable(this);
		this.sortsByKey = new Map((options.sorts ?? []).map((sort) => [sort.key, sort]));
		this.filtersByKey = new Map((options.filters ?? []).map((filter) => [filter.key, filter]));
		this.groupingsByKey = new Map(
			(options.groupings ?? []).map((grouping) => [grouping.key, grouping]),
		);
		this.externalMatchMode = options.externalMatchMode ?? 'union';
		this.activeFilterKeys = new Set(options.defaultActiveFilterKeys ?? []);

		this.sortKey = options.defaultSortKey ?? options.sorts?.[0]?.key ?? null;
		this.sortDirection = options.defaultSortDirection ?? 'asc';
		this.groupingKey = options.defaultGroupingKey ?? null;

		this.restorePersistedState();
	}

	get sorts(): SortDefinition<T>[] {
		return this.options.sorts ?? [];
	}

	get filters(): FilterDefinition<T>[] {
		return this.options.filters ?? [];
	}

	get groupings(): GroupingDefinition<T, G>[] {
		return this.options.groupings ?? [];
	}

	get hasSearch(): boolean {
		return Boolean(this.options.searchPredicate);
	}

	getId(item: T): string {
		return this.options.getId(item);
	}

	/**
	 * No-ops when `items` is shallowly equal to the current items, since
	 * `items` is an `@observable.ref` compared by reference: a caller that
	 * derives its array inline (e.g. `store.forSource(...)`, which allocates
	 * a fresh array every call even when its contents haven't changed) would
	 * otherwise mark `items` "changed" on every render, invalidate
	 * `visibleItems`/`groups`, and re-trigger whatever observer read them —
	 * including, if that's this same component, itself, forever.
	 */
	@action
	setItems(items: T[]) {
		if (shallowEqualArrays(this.items, items)) {
			return;
		}
		this.items = items;
	}

	@action
	setSearchQuery(query: string) {
		this.searchQuery = query;
	}

	@action
	setSort(key: string | null, direction: SortDirection = this.sortDirection) {
		this.sortKey = key;
		this.sortDirection = direction;
	}

	@action
	toggleSortDirection() {
		this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
	}

	@action
	toggleFilter(key: string) {
		if (this.activeFilterKeys.has(key)) {
			this.activeFilterKeys.delete(key);
		} else {
			this.activeFilterKeys.add(key);
		}
	}

	isFilterActive(key: string): boolean {
		return this.activeFilterKeys.has(key);
	}

	@action
	setFilterActive(key: string, active: boolean) {
		if (active) {
			this.activeFilterKeys.add(key);
		} else {
			this.activeFilterKeys.delete(key);
		}
	}

	@action
	clearFilters() {
		this.activeFilterKeys.clear();
		this.searchQuery = '';
		this.externalMatchIds = null;
	}

	@action
	setGrouping(key: string | null) {
		this.groupingKey = key;
	}

	/** Lets an async/external search (e.g. semantic search) contribute matches by id. */
	@action
	setExternalMatches(ids: ReadonlySet<string> | null) {
		this.externalMatchIds = ids;
	}

	@action
	select(id: string) {
		if (this.options.selectionMode === 'single') {
			this.selectedIds = new Set([id]);

			return;
		}
		this.selectedIds.add(id);
	}

	@action
	toggleSelected(id: string) {
		if (this.options.selectionMode === 'single') {
			this.selectedIds = this.selectedIds.has(id) ? new Set() : new Set([id]);

			return;
		}

		if (this.selectedIds.has(id)) {
			this.selectedIds.delete(id);
		} else {
			this.selectedIds.add(id);
		}
	}

	@action
	selectAll() {
		if (this.options.selectionMode !== 'multi') {
			return;
		}
		this.selectedIds = new Set(this.visibleItems.map(this.options.getId));
	}

	@action
	clearSelection() {
		this.selectedIds.clear();
	}

	isSelected(id: string): boolean {
		return this.selectedIds.has(id);
	}

	@computed
	get selectedId(): string | null {
		return this.selectedIds.values().next().value ?? null;
	}

	@computed
	private get localMatches(): T[] {
		const { searchPredicate } = this.options;
		const query = this.searchQuery.trim();

		return this.items.filter((item) => {
			if (query && searchPredicate && !searchPredicate(item, query)) {
				return false;
			}

			for (const key of this.activeFilterKeys) {
				const filter = this.filtersByKey.get(key);
				if (filter && !filter.predicate(item)) {
					return false;
				}
			}

			return true;
		});
	}

	@computed
	get visibleItems(): T[] {
		let items = this.localMatches;
		const { getId } = this.options;

		if (this.externalMatchIds) {
			const external = this.externalMatchIds;
			if (this.externalMatchMode === 'intersect') {
				items = items.filter((item) => external.has(getId(item)));
			} else {
				const seen = new Set(items.map(getId));
				const extras = this.items.filter(
					(item) => external.has(getId(item)) && !seen.has(getId(item)),
				);
				items = [...items, ...extras];
			}
		}

		const sort = this.sortKey ? this.sortsByKey.get(this.sortKey) : null;
		if (!sort) {
			return items;
		}

		const sorted = [...items].sort(sort.compare);

		return this.sortDirection === 'desc' ? sorted.reverse() : sorted;
	}

	/** Null when no grouping is active; render `visibleItems` flat in that case. */
	@computed
	get groups(): DataGroup<T, G>[] | null {
		const grouping = this.groupingKey ? this.groupingsByKey.get(this.groupingKey) : null;
		if (!grouping) {
			return null;
		}

		const byKey = new Map<string, DataGroup<T, G>>();
		for (const item of this.visibleItems) {
			const groupKey = grouping.groupOf(item);
			const mapKey = String(groupKey);
			let group = byKey.get(mapKey);
			if (!group) {
				group = {
					key: groupKey,
					label: grouping.groupLabel?.(groupKey) ?? mapKey,
					items: [],
				};
				byKey.set(mapKey, group);
			}
			group.items.push(item);
		}

		const groups = [...byKey.values()];
		if (grouping.compareGroups) {
			groups.sort((left, right) => grouping.compareGroups!(left.key, right.key));
		} else {
			groups.sort((left, right) => left.label.localeCompare(right.label));
		}

		return groups;
	}

	[Symbol.dispose]() {
		for (const dispose of this.disposers) {
			dispose();
		}
		this.disposers.length = 0;
	}

	private restorePersistedState() {
		const { persistence } = this.options;
		if (!persistence) {
			return;
		}
		const { service, namespace, persist = {} } = persistence;

		if (persist.sort ?? true) {
			this.watch(service, `${namespace}.sortKey`, 'sortKey', this.sortKey);
			this.watch(service, `${namespace}.sortDirection`, 'sortDirection', this.sortDirection);
		}
		if (persist.grouping ?? true) {
			this.watch(service, `${namespace}.groupingKey`, 'groupingKey', this.groupingKey);
		}
		if (persist.filters ?? true) {
			this.activeFilterKeys = new Set(
				service.retrieve<string[]>(`${namespace}.activeFilterKeys`, []) ?? [],
			);
			this.disposers.push(
				reaction(
					() => [...this.activeFilterKeys].sort(),
					(keys) => service.store(`${namespace}.activeFilterKeys`, keys),
				),
			);
		}
		if (persist.selection) {
			this.selectedIds = new Set(
				service.retrieve<string[]>(`${namespace}.selectedIds`, []) ?? [],
			);
			this.disposers.push(
				reaction(
					() => [...this.selectedIds].sort(),
					(ids) => service.store(`${namespace}.selectedIds`, ids),
				),
			);
		}
	}

	private watch<P extends 'sortKey' | 'sortDirection' | 'groupingKey'>(
		service: PersistenceService,
		storageKey: string,
		property: P,
		defaultValue: this[P],
	) {
		this[property] = service.retrieve(storageKey, defaultValue) ?? defaultValue;

		this.disposers.push(
			reaction(
				() => this[property],
				(value) => service.store(storageKey, value),
			),
		);
	}
}

function shallowEqualArrays<T>(a: T[], b: T[]): boolean {
	if (a === b) {
		return true;
	}
	if (a.length !== b.length) {
		return false;
	}
	return a.every((item, index) => item === b[index]);
}
