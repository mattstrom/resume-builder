import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
} from 'mobx';
import type { RootStore } from '@/stores/root.store.ts';
import { SET_RESUME_FIELD } from '@/graphql/mutations.ts';
import { LIST_RESUMES } from '@/graphql/queries.ts';
import type {
	SetResumeFieldData,
	SetResumeFieldVariables,
} from '@/graphql/types.ts';

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
			await this.rootStore.client.mutate<
				SetResumeFieldData,
				SetResumeFieldVariables
			>({
				mutation: SET_RESUME_FIELD,
				variables: {
					id: resumeId,
					input: { path },
					value,
				},
				refetchQueries: [{ query: LIST_RESUMES }],
			});
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
