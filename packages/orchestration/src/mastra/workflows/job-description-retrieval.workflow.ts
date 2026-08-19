import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { jobDescriptionRetrieverAgent } from '../agents/job-description-retriever.agent';
import { jobPostingBrowserAgent } from '../agents/job-posting-browser.agent';
import { type Flow, recordFlowRun, toFlowRunStatus } from '../flow-runs';
import { withResumeBuilderTools } from '../mcp/resume-builder.mcp';
import { fetchJobPostingPage } from '../tools/fetch-job-posting.tool';
import { md } from '../utils';

const FLOW: Flow = 'jobDescriptionRetrieval';

/** Below this, the page is chrome rather than a posting. */
const MIN_DESCRIPTION_LENGTH = 400;
/** How the text reached the cleanup agent, so it knows how much chrome to expect. */
const SOURCE_NOTES = {
	'json-ld': ' (from its embedded JobPosting structured data)',
	html: ' (from the raw page HTML)',
	browser: ' (read from the rendered page in a browser)',
} as const;
/** Page text handed to the model. Postings never legitimately run this long. */
const MAX_MODEL_INPUT_LENGTH = 60_000;

const inputSchema = z.object({
	applicationId: z.string(),
	url: z
		.string()
		.optional()
		.describe("Overrides the application's stored job posting URL when provided"),
});

const outputSchema = z.object({
	applicationId: z.string(),
	url: z.string(),
	jobDescription: z.string(),
	characterCount: z.number(),
	title: z.string().optional(),
	company: z.string().optional(),
});

const requestContextSchema = z.object({
	[MASTRA_AUTH_TOKEN_KEY]: z.string().min(1),
});

const resolvedUrlSchema = z.object({
	applicationId: z.string(),
	url: z.string(),
});

const fetchedPageSchema = resolvedUrlSchema.extend({
	pageText: z.string(),
	source: z.enum(['json-ld', 'html', 'browser']),
	title: z.string().optional(),
	company: z.string().optional(),
});

const extractedDescriptionSchema = resolvedUrlSchema.extend({
	jobDescription: z.string(),
	title: z.string().optional(),
	company: z.string().optional(),
});

const resolvePostingUrl = createStep({
	id: 'resolve-posting-url',
	description: "Reads the application's job posting URL",
	inputSchema,
	outputSchema: resolvedUrlSchema,
	requestContextSchema,
	execute: async ({ inputData, requestContext, runId }) => {
		const { applicationId } = inputData;
		const overrideUrl = inputData.url?.trim();

		await recordFlowRun(requestContext, {
			flow: FLOW,
			subjectType: 'application',
			subjectId: applicationId,
			status: 'running',
			runId,
		});

		if (overrideUrl) {
			return { applicationId, url: overrideUrl };
		}

		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const result = await withResumeBuilderTools(token, (tools) =>
			tools['get_application'].execute!({ id: applicationId }, {} as any),
		);
		const application = (result as any)?.application;

		if (!application) {
			throw new Error(`Application ${applicationId} was not found.`);
		}

		const url = (application.jobPostingUrl as string | undefined)?.trim();

		if (!url) {
			throw new Error(
				`Application ${applicationId} has no job posting URL. Add one, or paste the job description directly.`,
			);
		}

		return { applicationId, url };
	},
});

/**
 * Drives a real browser at the posting. Reserved for pages a plain HTTP fetch
 * cannot read, since it costs a browser session and several model turns.
 */
async function readPostingWithBrowser(
	url: string,
	agent: typeof jobPostingBrowserAgent,
): Promise<string> {
	const result = await agent.generate(
		[
			{
				role: 'user',
				content: `Open ${url} and read back the full job description it renders.`,
			},
		],
		{
			maxSteps: 25,
			structuredOutput: {
				schema: z.object({
					isJobPosting: z
						.boolean()
						.describe(
							'False for sign-in walls, bot checks, search pages, or expired listings',
						),
					pageText: z
						.string()
						.describe(
							'The rendered job posting text, empty when isJobPosting is false',
						),
					reason: z
						.string()
						.optional()
						.describe('What the page turned out to be, when it is not a job posting'),
				}),
			},
		},
	);

	if (!result.object.isJobPosting) {
		throw new Error(
			`The browser could not reach a job posting at ${url}${
				result.object.reason ? `: ${result.object.reason}` : '.'
			}`,
		);
	}

	return result.object.pageText.trim();
}

const fetchPostingPage = createStep({
	id: 'fetch-posting-page',
	description:
		'Retrieves the job posting page over HTTP, falling back to the agent browser for JavaScript-rendered postings',
	inputSchema: resolvedUrlSchema,
	outputSchema: fetchedPageSchema,
	execute: async ({ inputData, mastra }) => {
		const { applicationId, url } = inputData;
		const page = await fetchJobPostingPage(url);
		const httpFailure =
			!page.ok || page.source === 'none'
				? (page.error ?? 'No readable text was returned.')
				: page.text.length < MIN_DESCRIPTION_LENGTH
					? `Only ${page.text.length} characters of text were returned, too little to be a job description.`
					: undefined;

		if (!httpFailure) {
			return {
				applicationId,
				url,
				pageText: page.text.slice(0, MAX_MODEL_INPUT_LENGTH),
				source: page.source === 'json-ld' ? ('json-ld' as const) : ('html' as const),
				title: page.title,
				company: page.company,
			};
		}

		// Most postings that fail a plain fetch are rendered client-side or gate
		// non-browser clients, both of which a real browser gets past.
		let browserText: string;

		try {
			browserText = await readPostingWithBrowser(
				url,
				mastra?.getAgent('jobPostingBrowser') ?? jobPostingBrowserAgent,
			);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);

			throw new Error(
				`Could not read the job posting at ${url}. HTTP fetch: ${httpFailure} Browser: ${reason} Paste the job description manually instead.`,
			);
		}

		if (browserText.length < MIN_DESCRIPTION_LENGTH) {
			throw new Error(
				`Could not read the job posting at ${url}. HTTP fetch: ${httpFailure} The browser recovered only ${browserText.length} characters. Paste the job description manually instead.`,
			);
		}

		return {
			applicationId,
			url,
			pageText: browserText.slice(0, MAX_MODEL_INPUT_LENGTH),
			source: 'browser' as const,
			title: page.title,
			company: page.company,
		};
	},
});

const extractJobDescription = createStep({
	id: 'extract-job-description',
	description: 'Strips site chrome from the fetched page, leaving the job description',
	inputSchema: fetchedPageSchema,
	outputSchema: extractedDescriptionSchema,
	requestContextSchema,
	execute: async ({ inputData, mastra, requestContext }) => {
		const { applicationId, url, pageText, source, title, company } = inputData;
		const agent = mastra?.getAgent('jobDescriptionRetriever') ?? jobDescriptionRetrieverAgent;

		const prompt = md`
			The following text was extracted from the job posting at ${url}${SOURCE_NOTES[source]}.

			${title ? `Page-declared job title: ${title}` : ''}
			${company ? `Page-declared hiring organization: ${company}` : ''}

			Remove everything that is not part of the job description itself, preserving the
			posting's original wording, order, and section headings.

			---

			${pageText}
		`;

		const result = await agent.generate([{ role: 'user', content: prompt }], {
			requestContext,
			structuredOutput: {
				schema: z.object({
					isJobPosting: z
						.boolean()
						.describe(
							'False when the page is a login wall, search page, or expired listing',
						),
					jobDescription: z
						.string()
						.describe('The cleaned job description, empty when isJobPosting is false'),
					title: z.string().optional().describe('The job title as stated in the posting'),
					company: z
						.string()
						.optional()
						.describe('The hiring company as stated in the posting'),
					reason: z
						.string()
						.optional()
						.describe('What the page turned out to be, when it is not a job posting'),
				}),
			},
		});

		const extracted = result.object;

		if (!extracted.isJobPosting) {
			throw new Error(
				`The page at ${url} does not appear to be a job posting${
					extracted.reason ? `: ${extracted.reason}` : '.'
				}`,
			);
		}

		const jobDescription = extracted.jobDescription.trim();

		if (jobDescription.length < MIN_DESCRIPTION_LENGTH) {
			throw new Error(
				`Only ${jobDescription.length} characters of job description could be recovered from ${url}. Paste the job description manually instead.`,
			);
		}

		return {
			applicationId,
			url,
			jobDescription,
			title: extracted.title ?? title,
			company: extracted.company ?? company,
		};
	},
});

const persistJobDescription = createStep({
	id: 'persist-job-description',
	description: 'Saves the retrieved job description onto the application',
	inputSchema: extractedDescriptionSchema,
	outputSchema,
	requestContextSchema,
	execute: async ({ inputData, requestContext }) => {
		const { applicationId, url, jobDescription, title, company } = inputData;
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		await withResumeBuilderTools(token, (tools) =>
			tools['update_job_description'].execute!({ applicationId, jobDescription }, {} as any),
		);

		return {
			applicationId,
			url,
			jobDescription,
			characterCount: jobDescription.length,
			title,
			company,
		};
	},
});

export const jobDescriptionRetrievalWorkflow = createWorkflow({
	id: 'job-description-retrieval-workflow',
	description:
		"Pulls the job description from an application's job posting URL and saves it to the application",
	requestContextSchema,
	inputSchema,
	outputSchema,
	options: {
		// Fires on every terminal status, so the row can never be left stranded
		// in `running` by a step that threw or a client that disconnected.
		onFinish: async ({ status, error, runId, requestContext, getInitData }) => {
			const { applicationId } = getInitData() as z.infer<typeof inputSchema>;

			await recordFlowRun(requestContext, {
				flow: FLOW,
				subjectType: 'application',
				subjectId: applicationId,
				status: toFlowRunStatus(status),
				runId,
				error: error ? (error.message ?? String(error)) : undefined,
				finishedAt: new Date().toISOString(),
			});
		},
	},
})
	.then(resolvePostingUrl)
	.then(fetchPostingPage)
	.then(extractJobDescription)
	.then(persistJobDescription)
	.commit();
