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
				this.editValue = '';
				this.resumeId = null;
			});
		}
	}
}
