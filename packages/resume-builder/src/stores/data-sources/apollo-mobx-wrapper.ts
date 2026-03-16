import {
	ApolloClient,
	type ErrorLike,
	ObservableQuery,
	type OperationVariables,
} from '@apollo/client';
import { makeObservable, observable } from 'mobx';
import { Subscription } from 'rxjs';

export class ApolloMobxWrapper<
	TData = unknown,
	TVariables extends OperationVariables = OperationVariables,
> {
	@observable
	public result: ObservableQuery.Result<TData> | null = null;

	get data(): TData | null {
		if (!this.result) {
			return null;
		}

		switch (this.result.dataState) {
			case 'streaming':
			case 'partial':
			case 'complete': {
				return this.result.data as TData;
			}
			case 'empty':
			default: {
				return null;
			}
		}
	}

	get loading(): boolean {
		return this.result?.loading ?? false;
	}

	get error(): ErrorLike | null {
		return this.result?.error ?? null;
	}

	private subscription: Subscription | null = null;

	constructor(
		private readonly observableQuery: ObservableQuery<TData, TVariables>,
	) {
		makeObservable(this);

		this.subscription = this.observableQuery.subscribe((result) => {
			this.result = result;
		});
	}

	[Symbol.dispose]() {
		this.subscription?.unsubscribe();
		this.subscription = null;
	}

	async refetch(
		...args: Parameters<ObservableQuery<TData, TVariables>['refetch']>
	) {
		return this.observableQuery.refetch(...args);
	}

	static create<
		TData,
		TVariables extends OperationVariables = OperationVariables,
	>(
		client: ApolloClient,
		options: ApolloClient.WatchQueryOptions<TData, TVariables>,
	): ApolloMobxWrapper<TData, TVariables> {
		const query = client.watchQuery(options);
		return new ApolloMobxWrapper(query);
	}
}
