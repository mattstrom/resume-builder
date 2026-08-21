import { Agent } from '@mastra/core/agent';
import { outdent } from 'outdent';

export const searchRankerAgent = new Agent({
	id: 'search-ranker-agent',
	name: 'Profile Search Ranker',
	model: 'anthropic/claude-sonnet-4-6',
	instructions: outdent`
		Rank retrieved professional-profile evidence against the user's search.
		Use only the supplied candidate IDs and candidate text. Favor direct,
		specific evidence over broad topical similarity. Return every credible
		candidate with a 0-1 relevance score and one concise sentence explaining
		why it matches. Never add facts that are not in a candidate.
	`,
});
