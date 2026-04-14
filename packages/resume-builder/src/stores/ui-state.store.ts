import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { StorageKey } from '@/stores/services/persistence.service.ts';
import type { RootStore } from '@/stores/root.store.ts';

export enum Mode {
	Analysis = 'analysis',
	Tailor = 'tailor',
	Form = 'form',
	Review = 'review',
	Edit = 'edit',
}

export enum ViewMode {
	Data = 'data',
	Layout = 'layout',
	Simple = 'simple',
}

export class UiStateStore {
	@observable
	mode: Mode = Mode.Review;

	@observable
	viewMode: ViewMode = ViewMode.Layout;

	@observable
	sidebarOpen: boolean = false;

	@observable
	chatOpen: boolean = false;

	@computed
	get isResumeEditable() {
		return (
			[Mode.Tailor, Mode.Edit].includes(this.mode) && !this.isPreviewRoute
		);
	}

	@computed
	get isPreviewRoute() {
		return window.location.pathname.includes('/preview/');
	}

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);

		this.watch('mode', StorageKey.Mode, Mode.Review);
		this.watch('viewMode', StorageKey.ViewMode, ViewMode.Layout);
		this.watch('sidebarOpen', StorageKey.SidebarOpen, false);
		this.watch('chatOpen', StorageKey.ChatOpen, false);
	}

	@action
	setMode(mode: Mode) {
		const { router } = this.rootStore;

		router?.navigate({
			search: { mode } as any,
		});

		this.mode = mode;

		if (this.mode !== Mode.Edit) {
			this.rootStore.inlineEditStore.discard();
			this.rootStore.listEditStore.discard();
		}

		if (this.mode === Mode.Review) {
			this.viewMode = ViewMode.Layout;
		}
	}

	@action
	setChatOpen(open?: boolean) {
		this.chatOpen = open === undefined ? !this.chatOpen : open;
	}

	@action
	setViewMode(viewMode: ViewMode) {
		this.viewMode = viewMode;
	}

	@action
	setSidebarOpen(open?: boolean) {
		this.sidebarOpen = open === undefined ? !this.sidebarOpen : open;
	}

	watch<P extends keyof this>(
		property: P,
		storageKey: StorageKey,
		defaultValue: this[P],
	) {
		const { persistence } = this.rootStore;

		this[property] = persistence.retrieveSession(storageKey, defaultValue)!;

		reaction(
			() => this[property],
			(value) => {
				persistence.storeSession(storageKey, value);
			},
		);
	}
}
