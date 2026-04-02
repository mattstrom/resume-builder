import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
} from 'mobx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { reorderItems } from '@/lib/reorder.ts';
import type { RootStore } from '@/stores/root.store.ts';

export class ListEditStore {
	@observable
	activePath: string | null = null;

	@observable
	items: string[] = [];

	@observable
	resumeId: string | null = null;

	@observable
	isSaving = false;

	/** Index of the item currently being edited, or null */
	@observable
	editingIndex: number | null = null;

	@observable
	editValue = '';

	/** Whether we're adding a new item at the end */
	@observable
	isAdding = false;

	@observable
	addValue = '';

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);
	}

	@computed
	get isActive() {
		return this.activePath !== null;
	}

	isEditing(path: string): boolean {
		return this.activePath === path;
	}

	@action
	beginEdit(resumeId: string, path: string, currentItems: string[]) {
		this.resumeId = resumeId;
		this.activePath = path;
		this.items = [...currentItems];
		this.editingIndex = null;
		this.editValue = '';
		this.isAdding = false;
		this.addValue = '';
	}

	@action
	discard() {
		this.activePath = null;
		this.items = [];
		this.resumeId = null;
		this.editingIndex = null;
		this.editValue = '';
		this.isAdding = false;
		this.addValue = '';
	}

	@action
	beginEditItem(index: number) {
		this.editingIndex = index;
		this.editValue = this.items[index] ?? '';
		this.isAdding = false;
		this.addValue = '';
	}

	@action
	updateEditValue(value: string) {
		this.editValue = value;
	}

	@action
	commitEditItem() {
		if (
			this.editingIndex !== null &&
			this.editingIndex < this.items.length
		) {
			this.items[this.editingIndex] = this.editValue;
		}
		this.editingIndex = null;
		this.editValue = '';
	}

	@action
	cancelEditItem() {
		this.editingIndex = null;
		this.editValue = '';
	}

	@action
	removeItem(index: number) {
		this.items.splice(index, 1);
		if (this.editingIndex === index) {
			this.editingIndex = null;
			this.editValue = '';
		}
	}

	@action
	moveItem(fromIndex: number, toIndex: number) {
		const nextItems = reorderItems(this.items, fromIndex, toIndex);

		if (
			nextItems.length === this.items.length &&
			nextItems.every((item, index) => item === this.items[index])
		) {
			return;
		}

		this.items = nextItems;

		if (this.editingIndex === null) {
			return;
		}

		if (this.editingIndex === fromIndex) {
			this.editingIndex = toIndex;
			return;
		}

		if (fromIndex < toIndex) {
			if (this.editingIndex > fromIndex && this.editingIndex <= toIndex) {
				this.editingIndex -= 1;
			}
			return;
		}

		if (this.editingIndex >= toIndex && this.editingIndex < fromIndex) {
			this.editingIndex += 1;
		}
	}

	@action
	beginAdd() {
		this.isAdding = true;
		this.addValue = '';
		this.editingIndex = null;
		this.editValue = '';
	}

	@action
	updateAddValue(value: string) {
		this.addValue = value;
	}

	@action
	commitAdd() {
		if (this.addValue.trim()) {
			this.items.push(this.addValue.trim());
		}
		this.isAdding = false;
		this.addValue = '';
	}

	@action
	cancelAdd() {
		this.isAdding = false;
		this.addValue = '';
	}

	async commit() {
		if (!this.activePath || !this.resumeId) {
			return;
		}

		const path = this.activePath;
		const value = [...this.items];
		const resumeId = this.resumeId;

		runInAction(() => {
			this.isSaving = true;
		});

		try {
			getActiveResumeController(resumeId)?.setField(path, value);
		} finally {
			runInAction(() => {
				this.isSaving = false;
				this.activePath = null;
				this.items = [];
				this.resumeId = null;
				this.editingIndex = null;
				this.editValue = '';
				this.isAdding = false;
				this.addValue = '';
			});
		}
	}
}
