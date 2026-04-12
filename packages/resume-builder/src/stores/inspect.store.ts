import { action, computed, makeObservable, observable } from 'mobx';
import { computedFn } from 'mobx-utils';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { RootStore } from '@/stores/root.store.ts';

export class InspectStore implements Disposable {
	@observable
	isInspectMode = false;

	@observable
	quickHighlight: boolean = false;

	@observable
	selectedPaths = new Map<string, string>();

	private disposers: DisposableStack = new DisposableStack();

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);

		this.disposers.adopt(
			fromEvent<KeyboardEvent>(document, 'keydown')
				.pipe(filter((event) => event.shiftKey))
				.subscribe(() => {
					this.quickHighlight = true;
				}),
			(sub) => {
				sub.unsubscribe();
			},
		);

		this.disposers.adopt(
			fromEvent<KeyboardEvent>(document, 'keyup').subscribe(() => {
				this.quickHighlight = false;
			}),
			(sub) => {
				sub.unsubscribe();
			},
		);
	}

	[Symbol.dispose](): void {
		this.disposers.dispose();
	}

	@action
	setQuickHighlight(value: boolean) {
		this.quickHighlight = value;
	}

	@computed
	get hasSelection() {
		return this.selectedPaths.size > 0;
	}

	@computed
	get selectedRegions() {
		return Array.from(this.selectedPaths.entries()).map(
			([path, label]) => ({
				path,
				label,
			}),
		);
	}

	isHighlighted = computedFn((path: string) => {
		if (this.quickHighlight) {
			return true;
		}

		return this.selectedPaths.has(path);
	});

	@action
	toggleInspectMode() {
		this.isInspectMode = !this.isInspectMode;
		if (!this.isInspectMode) {
			this.selectedPaths.clear();
		}
	}

	@action
	toggleSelected(path: string, label?: string) {
		if (this.selectedPaths.has(path)) {
			this.selectedPaths.delete(path);
		} else {
			this.selectedPaths.set(path, label ?? path);
		}
	}

	@action
	clearSelection() {
		this.selectedPaths.clear();
	}
}
