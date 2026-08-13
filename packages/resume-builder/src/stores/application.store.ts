import type { Application } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';

import { LIST_APPLICATIONS } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

export class ApplicationStore {
	private query: ApolloMobxWrapper<{ listApplications: Application[] }>;

	@observable
	selectedApplicationId: string | null = null;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		this.query = ApolloMobxWrapper.create<{
			listApplications: Application[];
		}>(rootStore.client, {
			query: LIST_APPLICATIONS,
		});
	}

	@computed
	get selectedApplication() {
		return (
			this.data.find((application) => application._id === this.selectedApplicationId) ?? null
		);
	}

	@computed
	get data(): Application[] {
		return this.query.data?.listApplications ?? [];
	}

	async refetch() {
		return this.query.refetch();
	}

	async identifyJobConcepts(applicationId: string): Promise<void> {
		const client = await getMastraClient();
		const workflow = client.getWorkflow('job-concept-identification-workflow');
		const run = await workflow.createRun();
		const result = await run.startAsync({ inputData: { applicationId } });

		if (result.status !== 'success') {
			const message =
				'error' in result && result.error instanceof Error
					? result.error.message
					: 'Requirement identification did not complete.';
			throw new Error(message);
		}
	}

	async assessFit(applicationId: string): Promise<void> {
		const client = await getMastraClient();
		const workflow = client.getWorkflow('fitAssessmentWorkflow');
		const run = await workflow.createRun();
		const result = await run.startAsync({ inputData: { applicationId } });

		if (result.status !== 'success') {
			const message =
				'error' in result && result.error instanceof Error
					? result.error.message
					: 'Fit assessment did not complete.';
			throw new Error(message);
		}
	}

	/**
	 * Pulls the job description from the application's posting URL and saves it.
	 * Falls back to a real browser server-side, so this can run for a while on
	 * JavaScript-rendered postings.
	 */
	async retrieveJobDescription(applicationId: string): Promise<number> {
		const client = await getMastraClient();
		const workflow = client.getWorkflow('job-description-retrieval-workflow');
		const run = await workflow.createRun();
		const result = await run.startAsync({ inputData: { applicationId } });

		if (result.status !== 'success') {
			const message =
				'error' in result && result.error instanceof Error
					? result.error.message
					: 'Job description retrieval did not complete.';
			throw new Error(message);
		}

		return (result.result as { characterCount: number }).characterCount;
	}

	@action
	selectApplication(applicationId: string | null) {
		this.selectedApplicationId = applicationId;
	}
}
