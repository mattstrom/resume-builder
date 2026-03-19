import {
	ApolloServerPlugin,
	GraphQLRequestContext,
	GraphQLRequestListener,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { Logger } from 'winston';

import { isIntrospectionQuery } from './is-introspection-query';
import { GqlContextValue } from './types';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin<GqlContextValue> {
	constructor(private readonly logger: Logger) {}

	async requestDidStart(
		requestContext: GraphQLRequestContext<GqlContextValue>,
	): Promise<GraphQLRequestListener<GqlContextValue> | void> {
		if (isIntrospectionQuery(requestContext.request.query!)) {
			return;
		}

		return {
			didResolveOperation: async (requestContext) => {
				const operationName = requestContext.operationName ?? 'unnamed';
				const { query } = requestContext.request;

				this.logger.info({
					operationName,
					query,
					variables: requestContext.request.variables,
				});
			},
		};
	}
}
