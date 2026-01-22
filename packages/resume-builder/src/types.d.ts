import { type RootStore } from './stores/root.store.ts';

declare global {
	var rootStore: RootStore;
}

export {};
