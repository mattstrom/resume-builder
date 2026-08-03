import { useEffect, useState } from 'react';

import {
	DataSourceController,
	type DataSourceControllerOptions,
} from '@/stores/data-sources/data-source-controller.ts';

/**
 * Creates a `DataSourceController` scoped to the component's lifetime.
 *
 * `options` (sorts/filters/groupings/selectionMode/...) should be
 * referentially stable, e.g. module-level constants, since they're only
 * read once, at construction. Feed the current items to the controller
 * with `controller.setItems(items)` directly in the render body, after
 * they're computed — the controller doesn't pull items itself, since a
 * pulled source only stays reactive when it happens to read MobX
 * observables (see the class doc comment).
 */
export function useDataSourceController<T, G = string>(
	options: DataSourceControllerOptions<T, G>,
): DataSourceController<T, G> {
	const [controller] = useState(() => new DataSourceController<T, G>(options));

	useEffect(() => {
		return () => controller[Symbol.dispose]();
	}, [controller]);

	return controller;
}
