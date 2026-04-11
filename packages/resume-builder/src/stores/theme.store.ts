import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { StorageKey } from '@/stores/services/persistence.service.ts';
import type { RootStore } from '@/stores/root.store.ts';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export class ThemeStore {
	@observable
	theme: Theme = 'system';

	@observable
	private systemPrefersDark = false;

	@computed
	get resolvedTheme(): ResolvedTheme {
		if (this.theme === 'system') {
			return this.systemPrefersDark ? 'dark' : 'light';
		}
		return this.theme;
	}

	private mediaQuery: MediaQueryList | null = null;

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);

		const { persistence } = this.rootStore;
		const stored = persistence.retrieve<Theme>(StorageKey.Theme, 'system');
		this.theme = stored ?? 'system';

		if (typeof window !== 'undefined' && window.matchMedia) {
			this.mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
			this.systemPrefersDark = this.mediaQuery.matches;
			this.mediaQuery.addEventListener('change', this.handleSystemChange);
		}

		// Sync across windows (e.g. parent ↔ preview iframe) via storage events.
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this.handleStorageChange);
		}

		// Apply class immediately so first paint is correct.
		this.applyThemeClass(this.resolvedTheme);

		reaction(
			() => this.resolvedTheme,
			(resolved) => this.applyThemeClass(resolved),
		);

		reaction(
			() => this.theme,
			(theme) => {
				persistence.store(StorageKey.Theme, theme);
			},
		);
	}

	@action
	setTheme(theme: Theme) {
		this.theme = theme;
	}

	@action
	private handleSystemChange = (event: MediaQueryListEvent) => {
		this.systemPrefersDark = event.matches;
	};

	@action
	private handleStorageChange = (event: StorageEvent) => {
		if (event.key !== StorageKey.Theme) return;
		try {
			const next = event.newValue
				? (JSON.parse(event.newValue) as Theme)
				: 'system';
			if (next !== this.theme) {
				this.theme = next;
			}
		} catch {
			// ignore malformed values
		}
	};

	private applyThemeClass(resolved: ResolvedTheme) {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (resolved === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	}

	dispose() {
		this.mediaQuery?.removeEventListener('change', this.handleSystemChange);
		if (typeof window !== 'undefined') {
			window.removeEventListener('storage', this.handleStorageChange);
		}
	}
}
