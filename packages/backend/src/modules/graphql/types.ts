import { IncomingMessage } from 'http';

/**
 * Represents the context object injected into the GraphQL lifecycle from Apollo's
 * [context initialization function](https://www.apollographql.com/docs/apollo-server/data/context/#the-context-function).
 */
export interface GqlContextValue {
	req: IncomingMessage;
}
