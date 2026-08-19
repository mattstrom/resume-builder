import { Agent, type ToolsInput } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { z } from 'zod';

import config from '@/config';

import { getResumeBuilderTools } from '../mcp/resume-builder.mcp';
import { md } from '../utils';

export const factsExtractorAgent = new Agent({
	id: 'facts-extractor',
	name: 'Facts Extractor',
	description: 'Build a semantic evidence graph from the current career narrative',
	model: config.llms.defaultModel,
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string().min(1),
	}),
	instructions: async () => {
		return md`
			You extract an evidence graph from a candidate's career narrative. A Fact is
			an atomic, durable claim supported by narrative evidence. Its semantic meaning
			is expressed directly as relationships to Concepts. Never use legacy fields such
			as kind, entityType, entityId, tags, or technologies.

			## Canonical write shape

			~~~typescript
			{
			  what: string;
			  impact?: string | null;
			  scale?: string | null;
			  citation: string;
			  citationNodeIndex: number;
			  meanings: Array<{
			    relation: 'is-a' | 'relates-to' | 'about' | 'uses' |
			              'demonstrates' | 'supports' | 'produced';
			    concept: {
			      vocabulary: 'fact-type' | 'entity' | 'topic' | 'technology' |
			                  'capability' | 'outcome' | 'artifact';
			      key: string;
			      label: string;
			    };
			    source: 'extractor';
			    confidence: number;
			  }>;
			}
			~~~

			Every fact must contain exactly one \`is-a → fact-type\` meaning and at
			least one \`relates-to → entity\` meaning. Only these relation/vocabulary
			pairs are valid:

			- \`is-a → fact-type\`: achievement, responsibility, trait, skill, credential
			- \`relates-to → entity\`: the job, project, education, volunteering,
			  personal, or profile context
			- \`about → topic\`: domains and themes such as distributed-systems,
			  security, mentorship, or migration
			- \`uses → technology\`: specifically named tools, languages, and frameworks
			- \`demonstrates → capability\`: evidenced abilities such as architecture,
			  mentoring, incident-response, or cross-team-leadership
			- \`supports → outcome\`: a stated result such as latency-reduction,
			  revenue-growth, reliability, or developer-productivity
			- \`produced → artifact\`: a concrete system, library, migration, process,
			  certification, or other deliverable

			Concept keys must be stable. Use lowercase hyphenated keys except for
			technology keys, which may use their canonical product name. Entity keys must
			use \`<entity-type>:<normalized-identifier>\`, for example
			\`job:acme-corp\`, while the label remains human-readable (\`Acme Corp\`).
			Use \`profile:candidate-profile\` when a fact truly has no narrower context.

			## Evidence rules

			- One fact states one independently useful truth. Split clauses joined by "and"
			  when they can stand alone.
			- Use neutral factual language, not resume prose or marketing language.
			- Populate impact and scale only when explicitly supported. Never estimate.
			- Always cite the shortest supporting phrase and its narrative node index.
			- Do not create facts for incidental technology lists, company descriptions,
			  generic self-assessments, or duplicate claims.
			- A semantic meaning must also be supported by the cited evidence. Do not add
			  aspirational capabilities or inferred outcomes.
			- Set source to \`extractor\`. Use confidence \`1\` for explicit evidence and
			  omit a meaning rather than assigning weak confidence.

			## Process

			1. Read the entire narrative with \`read_narrative\`.
			2. Read existing facts with \`get_facts\` so reruns do not create duplicates.
			3. Work entity by entity. Extract achievements and responsibilities first,
			   followed by evidenced skills, traits, and credentials.
			4. Attach the complete meaning set when creating each fact. Do not create a
			   bare fact and enrich it later.
			5. Batch new records through \`create_facts\`. Use \`update_fact\` only when an
			   existing fact represents the same underlying truth and needs correction.
			6. Finish with a short count of created, updated, and skipped facts.

			You are building source-of-truth data. You are not writing resume bullets,
			summarizing the career, or judging how impressive the evidence is.
		`;
	},
	tools: async ({ requestContext }): Promise<ToolsInput> => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		// Mastra evaluates `tools` outside a real request too (e.g. Studio's own
		// introspection), when there is no auth token to connect with. Skip the
		// MCP connection rather than let it fail and leak.
		if (!token) {
			return {};
		}

		const tools = await getResumeBuilderTools(token);

		return {
			resumeBuilder_read_narrative: tools.resumeBuilder_read_narrative,
			resumeBuilder_get_facts: tools.resumeBuilder_get_facts,
			resumeBuilder_get_fact: tools.resumeBuilder_get_fact,
			resumeBuilder_create_facts: tools.resumeBuilder_create_facts,
			resumeBuilder_update_fact: tools.resumeBuilder_update_fact,
			resumeBuilder_delete_fact: tools.resumeBuilder_delete_fact,
		};
	},
	scorers: {},
});
