import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import config from '@/config';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';
import { dtd, md } from '../utils';

const dtds = dtd`
	<!DOCTYPE job-posting [
	
	  <!ELEMENT job-posting (company-overview, role-overview, responsibilities, requirements, compensation, culture-note?, watch*)>
	
	  <!-- Company -->
	  <!ELEMENT company-overview (#PCDATA | company-name | tagline | culture-signal | growth-area)*>
	  <!ELEMENT company-name (#PCDATA)>
	  <!ELEMENT tagline (#PCDATA)>
	
	  <!-- Role -->
	  <!ELEMENT role-overview (#PCDATA | team | level | location | work-model | team-size | technology | implicit-requirement | keyword)*>
	  <!ELEMENT team (#PCDATA)>
	  <!ELEMENT level (#PCDATA)>
	  <!ELEMENT location (#PCDATA)>
	  <!ELEMENT work-model (#PCDATA)>
	  <!ELEMENT team-size (#PCDATA)>
	
	  <!-- Responsibilities -->
	  <!ELEMENT responsibilities (#PCDATA | responsibility)*>
	  <!ELEMENT responsibility (#PCDATA | keyword | technology | eval-criteria | implicit-requirement | team-dynamic | growth-area)*>
	  <!ATTLIST responsibility
	    type (feature-development | systems-design | cross-functional | engineering-excellence | ai-collaboration | leadership) #REQUIRED>
	
	  <!-- Requirements -->
	  <!ELEMENT requirements (#PCDATA | required | nice-to-have)*>
	  <!ELEMENT required (#PCDATA | skill)*>
	  <!ELEMENT nice-to-have (#PCDATA | skill)*>
	  <!ELEMENT skill (#PCDATA | keyword | technology | eval-criteria | years)*>
	  <!ATTLIST skill
	    type    (hard | soft | domain)  #REQUIRED
	    required (true | false)         #IMPLIED>
	  <!ELEMENT years (#PCDATA)>
	
	  <!-- Compensation -->
	  <!ELEMENT compensation (#PCDATA | salary-range | location | keyword)*>
	  <!ELEMENT salary-range (min, max)>
	  <!ELEMENT min (#PCDATA)>
	  <!ELEMENT max (#PCDATA)>
	
	  <!-- Culture -->
	  <!ELEMENT culture-note (#PCDATA | culture-signal | growth-area | keyword)*>
	  <!ELEMENT culture-signal (#PCDATA)>
	
	  <!-- Shared inline elements -->
	  <!ELEMENT technology (#PCDATA)>
	  <!ATTLIST technology
	    name NMTOKEN #REQUIRED>
	
	  <!ELEMENT keyword (#PCDATA)>
	  <!ELEMENT eval-criteria (#PCDATA)>
	  <!ELEMENT implicit-requirement (#PCDATA)>
	  <!ELEMENT team-dynamic (#PCDATA)>
	  <!ELEMENT growth-area (#PCDATA)>
	
	  <!-- Flags -->
	  <!ELEMENT watch (#PCDATA | work-model | location)*>
	
	]>
`;

const MARKUP_PROMPT = md`
	You are a technical recruiting analyst. Your job is to semantically mark up job descriptions using XML tags so they can be used downstream for resume tailoring, keyword matching, and interview preparation.
	
	## Document Type Definition
	
	The marked-up output must conform to the following DTD. Use it to determine valid elements, attributes, nesting, and attribute values.
	
	${dtds}
	
	## Tag Reference
	
	| Tag                                 | Usage                                                                                                                                                      |
	| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
	| \`<company-name>\`                    | The employer's name                                                                                                                                        |
	| \`<team>\`                            | The specific team or org within the company                                                                                                                |
	| \`<level>\`                           | Seniority level (explicit or implied)                                                                                                                      |
	| \`<location>\`                        | Office location(s)                                                                                                                                         |
	| \`<work-model>\`                      | Remote / hybrid / onsite                                                                                                                                   |
	| \`<technology name="...">\`           | A specific language, framework, or tool. The \`name\` attribute must be lowercase-hyphenated (e.g. \`name="typescript"\`, \`name="react"\`, \`name="postgresql"\`) |
	| \`<skill type="..." required="...">\` | A skill. \`type\` must be \`hard\`, \`soft\`, or \`domain\`. \`required\` is \`true\` or \`false\`                                                                       |
	| \`<responsibility type="...">\`       | A job duty. \`type\` must be one of: \`feature-development\`, \`systems-design\`, \`cross-functional\`, \`engineering-excellence\`, \`ai-collaboration\`, \`leadership\` |
	| \`<eval-criteria>\`                   | Phrasing that signals what will be assessed in interviews — often verbatim from a scorecard                                                                |
	| \`<culture-signal>\`                  | Values language that hints at what the company rewards and how they hire                                                                                   |
	| \`<implicit-requirement>\`            | Something the role clearly demands but isn't stated outright                                                                                               |
	| \`<team-dynamic>\`                    | How the team operates or who you'd collaborate with                                                                                                        |
	| \`<growth-area>\`                     | Where the role or product is headed                                                                                                                        |
	| \`<keyword>\`                         | A term worth mirroring in resume and cover letter copy for ATS and recruiter alignment                                                                     |
	| \`<salary-range>\`                    | Wraps \`<min>\` and \`<max>\` child elements                                                                                                                   |
	| \`<team-size>\`                       | Headcount or team scale information                                                                                                                        |
	| \`<watch>\`                           | A flag worth noting before applying — location constraints, unusual requirements, red flags                                                                |
	
	## Rules
	
	1. **Preserve original text exactly.** Do not rewrite, summarize, or reorder. Only wrap.
	2. **Tags may nest** per the DTD. A \`<skill>\` may contain \`<keyword>\` and \`<technology>\`. A \`<responsibility>\` may contain \`<eval-criteria>\`.
	3. **Tag generously.** When in doubt, tag it. Downstream consumers will filter; missing tags are harder to recover than extra ones.
	4. **\`<keyword>\` is additive.** Apply it to any term worth mirroring in resume or cover letter copy, even if another tag already wraps the same text.
	5. **\`<eval-criteria>\` is high-signal.** Flag any phrasing that reads like an evaluation rubric rather than a job description.
	6. **\`<implicit-requirement>\` requires inference.** Read between the lines — "work across the stack" implies monorepo familiarity, shared type contracts, API design. Tag these explicitly.
	7. **Do not invent content.** Only \`<watch>\` and \`<implicit-requirement>\` involve inference. All other tags wrap existing text.
	8. **Wrap the tightest meaningful span.** Don't wrap an entire paragraph in \`<keyword>\` when a single phrase is the target.
	9. **Every \`<technology>\` must have a \`name\` attribute.** Every \`<skill>\` must have a \`type\` attribute. Every \`<responsibility>\` must have a \`type\` attribute.
	10. **The output must be a single well-formed XML document** with \`<job-posting>\` as the root element, beginning with the DOCTYPE declaration.
	
	## Output
	
	Return the marked-up job description as a single well-formed XML document conforming to the DTD above. No commentary, preamble, or content outside the XML document. DO NOT include the DTDs.
`;

const markupAgent = new Agent({
	id: 'markup-agent',
	name: 'Markup Agent',
	description: 'Markup the job description with XML',
	model: config.llms.defaultModel,
	instructions: MARKUP_PROMPT,
});

const fetchJobDescriptionStep = createStep({
	id: 'fetch-job-description',
	description: 'Fetches the job description',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({
		applicationId: z.string().optional(),
		jobDescription: z.string().optional(),
	}),
	outputSchema: z.object({
		jobDescription: z.string(),
	}),
	execute: async ({ inputData, requestContext }) => {
		if (inputData.jobDescription) {
			return { jobDescription: inputData.jobDescription };
		}

		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_application.execute!(
			{ id: inputData.applicationId },
			{} as any,
		);

		return { jobDescription: result.application.jobDescription as string };
	},
});

const markupJobDescription = createStep({
	id: 'markup-job-description',
	description: 'Markup the job description with XML',
	inputSchema: z.object({
		jobDescription: z.string(),
	}),
	outputSchema: z.string(),
	execute: async ({ inputData }) => {
		const prompt = md`
			Mark up this job description with XML tags
			---
			${inputData.jobDescription}
		`;

		const response = await markupAgent.generate(prompt, {
			structuredOutput: {
				schema: z.string(),
			},
		});

		return response.object;
	},
});

const DISTILL_JOB_DESCRIPTION = md`
	You are a technical recruiting analyst. Your job is to extract evidence requirements from a semantically marked-up
	job description XML document and produce a flat XML list of items that a candidate must provide supporting evidence
	for.

	## Input

	You will receive a job posting marked up with the following schema. The relevant source elements are:

	- \`/job-posting/requirements/required/skill\` — required skills, each with \`type\` (hard | soft | domain) and
	  \`required="true"\`
	- \`/job-posting/requirements/nice-to-have/skill\` — optional skills, each with \`type\` (hard | soft | domain) and
	  \`required="false"\`
	- \`/job-posting/responsibilities/responsibility\` — job duties, each with a \`type\` attribute
	- \`/job-posting/responsibilities/responsibility/eval-criteria\` — inline eval criteria nested inside
	  responsibilities; treat these as standalone evidence items
	- \`/job-posting/requirements/required/skill/eval-criteria\` — inline eval criteria nested inside skills; treat
	  these as standalone evidence items

	## Output Format

	Return a single well-formed XML document with the following structure:

	~~~xml
	<?xml version="1.0" encoding="UTF-8"?>
	<evidence-requirements>

	  <item id="{n}" source="{source}" type="{type}" xpath="{xpath}">
		<text>Distilled, plain-English description of what the candidate must demonstrate</text>
	  </item>

	</evidence-requirements>
	~~~

	### Attribute definitions

	| Attribute | Values                                          | Notes                                                                                                                                                                                                                                                                                                      |
	| --------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
	| \`id\`      | Integer, sequential from 1                      | Assigned in document order: required skills first, then nice-to-have, then responsibilities                                                                                                                                                                                                                |
	| \`source\`  | \`required\` \\                                   | \`nice-to-have\` \\                                                                                                                                                                                                                                                                                          | \`responsibility\` | Reflects which section of the source document the item came from |
	| \`type\`    | Inherits from source element's \`type\` attribute | For \`<skill>\` elements: \`hard\`, \`soft\`, or \`domain\`. For \`<responsibility>\` elements: \`feature-development\`, \`systems-design\`, \`cross-functional\`, \`engineering-excellence\`, \`ai-collaboration\`, or \`leadership\`                                                                                           |
	| \`xpath\`   | Valid XPath 1.0 expression                      | Must uniquely identify the source node in the input document. Use attribute predicates in preference to positional predicates where possible. When positional predicates are unavoidable, use the combination of \`@type\` and position to disambiguate (e.g. \`skill[@type='hard' and @required='true'][2]\`) |

	## Rules

	1. **One item per source node.** Each \`<skill>\` and each \`<responsibility>\` produces exactly one \`<item>\`,
	   even if it contains multiple nested tags.
	2. **Inline \`<eval-criteria>\` nodes are additive.** If a \`<skill>\` or \`<responsibility>\` contains an
	   \`<eval-criteria>\` child, extract it as an additional standalone \`<item>\` with the same \`source\` and
	   \`type\` as its parent, and an xpath pointing directly to the \`eval-criteria\` node.
	3. **Distill, don't quote.** The \`<text>\` content should be a clean plain-English statement of what must be
	   demonstrated — strip XML tags, merge \`<implicit-requirement>\` context where it adds meaning, and normalize
	   whitespace. Do not reproduce raw tag content verbatim.
	4. **Preserve document order.** Items appear in the order: \`required\` skills → \`nice-to-have\` skills →
	   \`responsibilities\`. Within each group, preserve source document order.
	5. **XPath must be unambiguous.** Every \`xpath\` attribute must select exactly one node in the source document.
	   Prefer attribute-based predicates over positional ones. If no attribute uniquely identifies a node, combine
	   \`@type\` with a positional predicate.
	6. **No commentary.** Return only the XML document. No preamble, explanation, or content outside the root element.
`;

const distillJobDescriptionAgent = new Agent({
	id: 'distill-job-description-agent',
	name: 'Distill Job Description Agent',
	description: 'Distill the marked-up job description',
	model: config.llms.defaultModel,
	instructions: DISTILL_JOB_DESCRIPTION,
});

const distillJobDescriptionStep = createStep({
	id: 'distill-job-description',
	description: 'Distill the marked-up job description',
	inputSchema: z.string(),
	outputSchema: z.string(),
	execute: async ({ inputData }) => {
		const prompt = md`
			Distill this job description into a concise summary
			---
			${inputData}
		`;

		const response = await distillJobDescriptionAgent.generate(prompt, {
			instructions: md``,
			structuredOutput: {
				schema: z.string(),
			},
		});

		return response.object;
	},
});

const markupJobDescriptionWorkflow = createWorkflow({
	id: 'markup-job-description-workflow',
	description: 'Markup the job description with XML',
	inputSchema: z.object({
		jobDescription: z.string().optional(),
		applicationId: z.string().optional(),
	}),
	outputSchema: z.object({
		xml: z.string(),
	}),
})
	.then(fetchJobDescriptionStep)
	.then(markupJobDescription)
	.then(distillJobDescriptionStep);

markupJobDescriptionWorkflow.commit();

export { markupJobDescriptionWorkflow };
