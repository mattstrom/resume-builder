import type { Application, Resume } from '@resume-builder/entities';
import { action, makeObservable, observable, runInAction, toJS } from 'mobx';

import { setActiveResumeController } from '@/lib/active-resume-controller.ts';
import {
	CrdtResumeController,
	LocalResumeController,
} from '@/lib/resume-document-controller.ts';

import { CREATE_BLANK_RESUME } from '../graphql/mutations.ts';
import {
	GET_APPLICATION,
	GET_RESUME,
	LIST_BASE_RESUMES,
	LIST_RESUMES,
} from '../graphql/queries.ts';
import type {
	BaseResumeSummary,
	CreateBlankResumeData,
	CreateBlankResumeVariables,
	GetApplicationData,
	GetApplicationVariables,
	GetResumeData,
	GetResumeVariables,
	ListBaseResumesData,
	ListResumesData,
	ListResumesVariables,
} from '../graphql/types.ts';
import type { RootStore } from './root.store.ts';

export class EditorStore {
	@observable resumeData: Resume | null = null;
	@observable applicationResumes: Resume[] = [];
	@observable baseResumes: BaseResumeSummary[] = [];
	@observable selectedApiApplicationId: string | null = null;
	@observable selectedApplication: Application | null = null;
	@observable isLoading = false;
	@observable error: string | null = null;

	@observable files: string[] = [];
	@observable selectedFile: string | null = null;
	readonly isSupported = 'showDirectoryPicker' in window;

	private controller: CrdtResumeController | LocalResumeController | null =
		null;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
	}

	@action
	async selectApplication(applicationId: string, resumeId?: string) {
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
			if (!application) {
				throw new Error('Application not found');
			}
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

			const targetResume =
				(resumeId ? resumes.find((r) => r._id === resumeId) : null) ??
				resumes[0] ??
				null;
			if (targetResume) {
				await this.setupCrdtController(targetResume);
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
						err instanceof Error ? err.message : 'Failed to load application';
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
	async selectStandaloneResume(resumeId: string) {
		if (!this.selectedApiApplicationId && this.resumeData?._id === resumeId)
			return;
		await this.controller?.destroy();
		this.controller = null;
		setActiveResumeController(null);
		runInAction(() => {
			this.isLoading = true;
			this.error = null;
			this.selectedApiApplicationId = null;
			this.selectedApplication = null;
			this.applicationResumes = [];
			this.resumeData = null;
		});

		try {
			const result = await this.rootStore.client.query<
				GetResumeData,
				GetResumeVariables
			>({
				query: GET_RESUME,
				variables: { id: resumeId },
				fetchPolicy: 'network-only',
			});
			const resume = result.data?.getResume;
			if (!resume) throw new Error('Resume not found');
			await this.setupCrdtController(resume);
		} catch (err) {
			runInAction(() => {
				this.error =
					err instanceof Error ? err.message : 'Failed to load resume';
			});
		} finally {
			runInAction(() => {
				this.isLoading = false;
			});
		}
	}

	@action
	async selectResume(resumeId: string) {
		const resume = this.applicationResumes.find((r) => r._id === resumeId);
		if (!resume) {
			return;
		}

		await this.controller?.destroy();
		this.controller = null;
		setActiveResumeController(null);

		await this.setupCrdtController(resume);
	}

	@action
	async loadBaseResumes() {
		try {
			const result = await this.rootStore.client.query<ListBaseResumesData>({
				query: LIST_BASE_RESUMES,
				fetchPolicy: 'network-only',
			});
			runInAction(() => {
				this.baseResumes = result.data?.listResumes ?? [];
			});
		} catch (err) {
			runInAction(() => {
				this.baseResumes = [];
				this.error =
					err instanceof Error ? err.message : 'Failed to load base resumes';
			});
		}
	}

	@action
	async createResumeForApplication(name: string, sourceResumeId?: string) {
		if (!this.selectedApplication) {
			return;
		}

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
						sourceResumeId,
					},
				},
			});

			const newResume = result.data?.createBlankResume;
			if (!newResume) {
				return;
			}

			runInAction(() => {
				this.applicationResumes = [...this.applicationResumes, newResume];
			});
			await this.selectResume(newResume._id);
		} catch (err) {
			runInAction(() => {
				this.error =
					err instanceof Error ? err.message : 'Failed to create resume';
			});
		}
	}

	@action
	updateResumeData(resume: Resume) {
		if (this.controller) {
			// replaceResume structuredClones, which fails on MobX proxies.
			this.controller.replaceResume(toJS(resume));
		} else {
			this.resumeData = resume;
		}
	}

	/**
	 * Devtools helper: `rootStore.editorStore.loadJson(<pasted JSON>)`
	 * replaces the active YDoc's contents with an arbitrary JSON blob.
	 */
	loadJson(json: string | Resume) {
		if (!this.controller) {
			throw new Error('No active resume controller to load into');
		}

		const resume = typeof json === 'string' ? JSON.parse(json) : json;
		this.controller.replaceResume(resume);
	}

	async destroy() {
		await this.controller?.destroy();
		setActiveResumeController(null);
	}

	private async setupCrdtController(resume: Resume) {
		// Resumes pulled from observable state are MobX proxies, which the
		// controller's structuredClone cannot handle — unwrap to plain data.
		const plainResume = toJS(resume);
		const token = await this.rootStore.authStore.ensureToken();
		const controller = await CrdtResumeController.connect({
			resumeId: plainResume._id,
			resume: plainResume,
			collaborationUrl: __CONFIG__.collaborationUrl,
			token,
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
			this.resumeData = controller.getSnapshot() ?? plainResume;
		});
	}
}
