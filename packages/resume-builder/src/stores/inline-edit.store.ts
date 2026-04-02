import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
} from 'mobx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import type { RootStore } from '@/stores/root.store.ts';

export class InlineEditStore {
	@observable
	activePath: string | null = null;

	@observable
	editValue = '';

	@observable
	resumeId: string | null = null;

	@observable
	isSaving = false;

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
	beginEdit(resumeId: string, path: string, currentValue: string) {
		this.resumeId = resumeId;
		this.activePath = path;
		this.editValue = currentValue;
	}

	@action
	updateValue(value: string) {
		this.editValue = value;
	}

	@action
	discard() {
		this.activePath = null;
		this.editValue = '';
		this.resumeId = null;
	}

	async commit() {
		if (!this.activePath || !this.resumeId) {
			return;
		}

		const path = this.activePath;
		const value = this.editValue;
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
				this.editValue = '';
				this.resumeId = null;
			});
		}
	}
}
