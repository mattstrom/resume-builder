/**
 * Checks if the given query string is an introspection query in GraphQL.
 *
 * @param {string} query - The GraphQL query string to evaluate.
 * @return {boolean} Returns `true` if the query is an introspection query, otherwise `false`.
 */
export function isIntrospectionQuery(query: string): boolean {
	return /^\s*query\s+IntrospectionQuery/.test(query);
}
