import { type Configuration } from './configuration.ts';
import { type RootStore } from './stores/root.store.ts';

declare global {
	var rootStore: RootStore;
	var __CONFIG__: Configuration;
}

export {};
