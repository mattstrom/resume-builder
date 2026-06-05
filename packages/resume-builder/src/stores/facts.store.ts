import { action, computed, makeObservable, observable } from 'mobx';

import { LIST_FACTS } from '../graphql/queries.ts';
import { authFetch } from '../utils/auth.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

const MASTRA_API_BASE = 'http://localhost:4111';

export interface Fact {
	id: string;
	uid: string;
	kind: string;
	entityType?: string;
	entityId?: string;
	what: string;
	impact?: string;
	scale?: string;
	citation?: string;
	citationNodeIndex?: number;
	tags: string[];
	technologies: string[];
	createdAt: string;
}

export class FactsStore {
	private query: ApolloMobxWrapper<{ facts: Fact[] }>;

	@observable isExtracting = false;

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

	@computed get factsGrouped(): Record<string, Record<string, Record<string, Fact[]>>> {
		const result: Record<string, Record<string, Record<string, Fact[]>>> = {};
		for (const fact of this.facts) {
			const entityType = fact.entityType ?? '';
			const entityId = fact.entityId ?? '';
			((result[entityType] ??= {})[entityId] ??= {})[fact.kind] ??= [];
			result[entityType][entityId][fact.kind].push(fact);
		}
		return result;
	}

	@action
	async extractFacts(): Promise<void> {
		this.isExtracting = true;
		try {
			await authFetch(`${MASTRA_API_BASE}/api/agents/factsExtractor/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [{ role: 'user', content: 'Extract facts from my narrative.' }],
				}),
			});
			await this.query.refetch();
		} finally {
			this.isExtracting = false;
		}
	}
}
