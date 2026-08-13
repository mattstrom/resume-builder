import { action, computed, makeObservable, observable } from 'mobx';

import { DELETE_FACT_CONCEPT, UPSERT_FACT_CONCEPT } from '../graphql/mutations.ts';
import { LIST_CONCEPT_SUGGESTIONS, LIST_FACTS } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

export interface Fact {
	id: string;
	uid: string;
	what: string;
	impact?: string;
	scale?: string;
	citation?: string;
	citationNodeIndex?: number;
	concepts: FactConcept[];
	createdAt: string;
}

export interface Concept {
	id: string;
	vocabulary: string;
	key: string;
	label: string;
	definition?: string;
	externalUri?: string;
}

export interface FactConcept {
	factId: string;
	conceptId: string;
	relation: string;
	source: string;
	confidence?: number;
	concept: Concept;
}

export interface FactMeaningInput {
	relation: string;
	concept: {
		vocabulary: string;
		key: string;
		label: string;
	};
	source?: string;
	confidence?: number;
}

export interface ConceptSuggestion {
	vocabulary: string;
	key: string;
	label: string;
	definition?: string | null;
}

export class FactsStore {
	private query: ApolloMobxWrapper<{ facts: Fact[] }>;

	@observable isExtracting = false;
	@observable isUpdatingMeaning = false;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ facts: Fact[] }>(rootStore.client, {
			query: LIST_FACTS,
		});
	}

	@computed get facts(): Fact[] {
		return this.query.data?.facts ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async refetch(): Promise<void> {
		await this.query.refetch();
	}

	@action
	async extractFacts(): Promise<void> {
		this.isExtracting = true;
		try {
			const client = await getMastraClient();
			const agent = client.getAgent('factsExtractor');
			await agent.generate([{ role: 'user', content: 'Extract facts from my narrative.' }]);
			await this.query.refetch();
		} finally {
			this.isExtracting = false;
		}
	}

	@action
	async upsertMeaning(factId: string, meaning: FactMeaningInput): Promise<void> {
		this.isUpdatingMeaning = true;
		try {
			await this.rootStore.client.mutate({
				mutation: UPSERT_FACT_CONCEPT,
				variables: { factId, meaning },
			});
			await this.query.refetch();
		} finally {
			this.isUpdatingMeaning = false;
		}
	}

	@action
	async deleteMeaning(factId: string, conceptId: string, relation: string): Promise<void> {
		this.isUpdatingMeaning = true;
		try {
			await this.rootStore.client.mutate({
				mutation: DELETE_FACT_CONCEPT,
				variables: { factId, conceptId, relation },
			});
			await this.query.refetch();
		} finally {
			this.isUpdatingMeaning = false;
		}
	}

	async getConceptSuggestions(vocabulary: string, search: string): Promise<ConceptSuggestion[]> {
		const result = await this.rootStore.client.query<{
			conceptSuggestions: ConceptSuggestion[];
		}>({
			query: LIST_CONCEPT_SUGGESTIONS,
			variables: { vocabulary, search, limit: 20 },
			fetchPolicy: 'network-only',
		});

		return result.data?.conceptSuggestions ?? [];
	}
}
