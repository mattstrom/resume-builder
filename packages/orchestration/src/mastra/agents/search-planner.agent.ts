import { Agent } from '@mastra/core/agent';
import { outdent } from 'outdent';

export const searchPlannerAgent = new Agent({
	id: 'search-planner-agent',
	name: 'Profile Search Planner',
	model: 'anthropic/claude-haiku-4-5',
	instructions: outdent`
		Interpret a search over one person's professional profile. Produce a concise
		interpretation and a small set of retrieval queries that cover synonyms,
		related technologies, and distinct constraints in the request. Preserve
		explicit names, numbers, and technologies. Do not invent career facts.
	`,
});
