import type { Application, Resume } from '@resume-builder/entities';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { client as apolloClient } from '../apollo-client.ts';
import { CREATE_BLANK_RESUME } from '../graphql/mutations.ts';
import { GET_APPLICATION, LIST_RESUMES } from '../graphql/queries.ts';
import type {
	CreateBlankResumeData,
	CreateBlankResumeVariables,
	GetApplicationData,
	GetApplicationVariables,
	ListResumesData,
	ListResumesVariables,
} from '../graphql/types.ts';
import { setActiveResumeController } from '@/lib/active-resume-controller.ts';
import {
	ApiResumeController,
	LocalResumeController,
} from '@/lib/resume-document-controller.ts';
import type { RootStore } from './root.store.ts';

export class EditorStore {
	@observable resumeData: Resume | null = null;
	@observable applicationResumes: Resume[] = [];
	@observable selectedApiApplicationId: string | null = null;
	@observable selectedApplication: Application | null = null;
	@observable isLoading = false;
	@observable error: string | null = null;

	@observable files: string[] = [];
	@observable selectedFile: string | null = null;
	readonly isSupported = 'showDirectoryPicker' in window;

	private controller: ApiResumeController | LocalResumeController | null =
		null;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
	}

	@action
	async selectApplication(applicationId: string) {
		await this.controller?.destroy();
		this.controller = null;
		setActiveResumeController(null);
		runInAction(() => {
			this.isLoading = true;
			this.error = null;
			this.selectedApiApplicationId = applicationId;
			this.selectedFile = null;
		});

		try {
			const applicationResult = await this.rootStore.client.query<
				GetApplicationData,
				GetApplicationVariables
			>({
				query: GET_APPLICATION,
				variables: { id: applicationId },
				fetchPolicy: 'network-only',
			});
			const application = applicationResult.data?.getApplication;
			if (!application) throw new Error('Application not found');
			runInAction(() => {
				this.selectedApplication = application;
			});

			const resumesResult = await this.rootStore.client.query<
				ListResumesData,
				ListResumesVariables
			>({
				query: LIST_RESUMES,
				variables: { filter: { applicationId } },
				fetchPolicy: 'network-only',
			});
			const resumes = resumesResult.data?.listResumes ?? [];
			runInAction(() => {
				this.applicationResumes = resumes;
			});

			const firstResume = resumes[0] ?? null;
			if (firstResume) {
				await this.setupApiController(firstResume);
			} else {
				runInAction(() => {
					this.resumeData = null;
				});
			}
		} catch (err) {
			const isAbortError =
				err instanceof Error &&
				(err.name === 'AbortError' || err.message.includes('aborted'));
			if (!isAbortError) {
				runInAction(() => {
					this.error =
						err instanceof Error
							? err.message
							: 'Failed to load application';
					this.selectedApiApplicationId = null;
					this.selectedApplication = null;
				});
			}
		} finally {
			runInAction(() => {
				this.isLoading = false;
			});
		}
	}

	@action
	async selectResume(resumeId: string) {
		const resume = this.applicationResumes.find((r) => r._id === resumeId);
		if (!resume) return;

		await this.controller?.destroy();
		this.controller = null;
		setActiveResumeController(null);

		await this.setupApiController(resume);
	}

	@action
	async createResumeForApplication(name: string) {
		if (!this.selectedApplication) return;

		try {
			const result = await this.rootStore.client.mutate<
				CreateBlankResumeData,
				CreateBlankResumeVariables
			>({
				mutation: CREATE_BLANK_RESUME,
				variables: {
					resumeData: {
						name,
						company: this.selectedApplication.company,
						jobPostingUrl: this.selectedApplication.jobPostingUrl,
						base: false,
						applicationId: this.selectedApplication._id,
					},
				},
			});

			const newResume = result.data?.createBlankResume;
			if (!newResume) return;

			runInAction(() => {
				this.applicationResumes = [
					...this.applicationResumes,
					newResume,
				];
			});
			await this.selectResume(newResume._id);
		} catch (err) {
			runInAction(() => {
				this.error =
					err instanceof Error
						? err.message
						: 'Failed to create resume';
			});
		}
	}

	@action
	updateResumeData(resume: Resume) {
		if (this.controller) {
			this.controller.replaceResume(resume);
		} else {
			this.resumeData = resume;
		}
	}

	async destroy() {
		await this.controller?.destroy();
		setActiveResumeController(null);
	}

	private async setupApiController(resume: Resume) {
		const controller = new ApiResumeController({
			resume,
			client: apolloClient,
			onSnapshotChange: (r) => {
				runInAction(() => {
					this.resumeData = r;
				});
			},
			onError: (error) => {
				runInAction(() => {
					this.error = error.message;
				});
			},
		});
		this.controller = controller;
		setActiveResumeController(controller);
		runInAction(() => {
			this.resumeData = resume;
		});
	}
}
