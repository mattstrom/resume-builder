export enum StorageKey {
	Mode = 'resume:mode',
	ViewMode = 'resume:viewMode',
	ApplicationExplorerApplicationSortField = 'applicationList.applicationSortField',
	ApplicationExplorerApplicationSortAscending = 'applicationList.applicationSortAscending',
	ApplicationExplorerGroupSortField = 'applicationList.groupSortField',
	ApplicationExplorerGroupSortAscending = 'applicationList.groupSortAscending',
	ApplicationExplorerGroupBy = 'applicationList.groupBy',
	ApplicationExplorerCollapsedGroups = 'applicationList.collapsedGroups',
}

export class PersistenceService {
	store<T>(key: string, value: T) {
		if (isNil(value)) {
			this.remove(key);
		} else {
			window.localStorage.setItem(key, JSON.stringify(value));
		}
	}

	retrieve<T>(key: string, defaultValue?: T): T | null {
		const value = window.localStorage.getItem(key);

		if (value) {
			try {
				return JSON.parse(value);
			} catch (err: any) {
				console.log(`Failed to retrieve value: ${err.message || err}`);
			}
		}

		return defaultValue ?? null;
	}

	storeSession<T>(key: string, value: T) {
		if (isNil(value)) {
			this.remove(key);
		} else {
			window.sessionStorage.setItem(key, JSON.stringify(value));
		}
	}

	retrieveSession<T>(key: string, defaultValue?: T): T | null {
		const value = window.sessionStorage.getItem(key);

		if (value) {
			try {
				return JSON.parse(value);
			} catch (err: any) {
				console.log(`Failed to retrieve value: ${err.message || err}`);
			}
		}

		return defaultValue ?? null;
	}

	remove(key: string) {
		window.localStorage.removeItem(key);
	}
}

function isNil(value: any): boolean {
	return value === null || value === undefined;
}
