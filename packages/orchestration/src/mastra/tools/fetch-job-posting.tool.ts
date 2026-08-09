import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 20_000;
const MAX_TEXT_LENGTH = 200_000;

/**
 * Hosts that would let a crafted job posting URL reach the private network the
 * orchestration server runs in.
 */
const BLOCKED_HOST_PATTERN =
	/^(localhost$|127\.|0\.0\.0\.0$|\[?::1\]?$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i;

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	apos: "'",
	bull: '•',
	copy: '©',
	gt: '>',
	hellip: '…',
	ldquo: '“',
	lsquo: '‘',
	lt: '<',
	mdash: '—',
	middot: '·',
	nbsp: ' ',
	ndash: '–',
	quot: '"',
	rdquo: '”',
	reg: '®',
	rsquo: '’',
	trade: '™',
};

export const jobPostingPageSchema = z.object({
	url: z.string().describe('The URL that was requested'),
	finalUrl: z.string().describe('The URL that ultimately served the content, after redirects'),
	ok: z.boolean().describe('Whether usable page content was retrieved'),
	status: z.number().describe('HTTP status code, or 0 when the request never completed'),
	source: z
		.enum(['json-ld', 'html', 'none'])
		.describe(
			'Where the text came from: the embedded JobPosting structured data, the rendered HTML, or nothing',
		),
	text: z.string().describe('Plain text extracted from the page'),
	truncated: z.boolean().describe('Whether the text was cut off at the length limit'),
	title: z.string().optional().describe('Job title, when the page declares one'),
	company: z.string().optional().describe('Hiring organization, when the page declares one'),
	error: z.string().optional().describe('Why retrieval failed, when it did'),
});

export type JobPostingPage = z.infer<typeof jobPostingPageSchema>;

function safeFromCodePoint(codePoint: number): string {
	try {
		return String.fromCodePoint(codePoint);
	} catch {
		return '';
	}
}

function decodeEntities(value: string): string {
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, decimal: string) => safeFromCodePoint(Number(decimal)))
		.replace(
			/&([a-z]+);/gi,
			(match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
		);
}

function normalizeWhitespace(value: string): string {
	return value
		.replace(/\r\n?/g, '\n')
		.replace(/[^\S\n]+/g, ' ')
		.replace(/ *\n */g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function htmlToText(html: string): string {
	const withoutNoise = html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(
			/<(script|style|noscript|svg|head|nav|footer|form|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,
			' ',
		);

	const withLineBreaks = withoutNoise
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<li\b[^>]*>/gi, '\n• ')
		.replace(/<\/(p|div|section|article|h[1-6]|li|ul|ol|table|tr|blockquote|header)>/gi, '\n');

	return normalizeWhitespace(decodeEntities(withLineBreaks.replace(/<[^>]+>/g, ' '))).replace(
		/\n{2,}(?=• )/g,
		'\n',
	);
}

function extractTitleTag(html: string): string | undefined {
	const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);

	return match ? normalizeWhitespace(decodeEntities(match[1])) || undefined : undefined;
}

interface JobPostingLd {
	title?: string;
	description?: string;
	hiringOrganization?: unknown;
}

function findJobPosting(node: unknown): JobPostingLd | undefined {
	if (Array.isArray(node)) {
		for (const item of node) {
			const found = findJobPosting(item);
			if (found) {
				return found;
			}
		}

		return undefined;
	}

	if (!node || typeof node !== 'object') {
		return undefined;
	}

	const record = node as Record<string, unknown>;
	const declaredType = record['@type'];
	const types = Array.isArray(declaredType) ? declaredType : [declaredType];

	if (types.includes('JobPosting') && typeof record['description'] === 'string') {
		return record as JobPostingLd;
	}

	if ('@graph' in record) {
		return findJobPosting(record['@graph']);
	}

	return undefined;
}

/**
 * Most applicant tracking systems (Greenhouse, Lever, Workday, LinkedIn) embed a
 * schema.org JobPosting in the page. It is far cleaner than the surrounding
 * markup, so prefer it when present.
 */
function extractJsonLdJobPosting(html: string): JobPostingLd | undefined {
	const blocks = html.matchAll(
		/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
	);

	for (const [, raw] of blocks) {
		let parsed: unknown;

		try {
			parsed = JSON.parse(raw.trim());
		} catch {
			continue;
		}

		const posting = findJobPosting(parsed);

		if (posting) {
			return posting;
		}
	}

	return undefined;
}

function organizationName(organization: unknown): string | undefined {
	if (typeof organization === 'string') {
		return organization;
	}

	if (organization && typeof organization === 'object') {
		const name = (organization as Record<string, unknown>)['name'];

		if (typeof name === 'string') {
			return name;
		}
	}

	return undefined;
}

function failure(url: string, status: number, error: string): JobPostingPage {
	return {
		url,
		finalUrl: url,
		ok: false,
		status,
		source: 'none',
		text: '',
		truncated: false,
		error,
	};
}

/**
 * Retrieves a job posting page as readable text. Resolves rather than rejects on
 * failure so callers can decide how to surface the reason.
 */
export async function fetchJobPostingPage(url: string): Promise<JobPostingPage> {
	let parsedUrl: URL;

	try {
		parsedUrl = new URL(url);
	} catch {
		return failure(url, 0, `"${url}" is not a valid URL.`);
	}

	if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
		return failure(url, 0, `Unsupported protocol "${parsedUrl.protocol}".`);
	}

	if (BLOCKED_HOST_PATTERN.test(parsedUrl.hostname)) {
		return failure(url, 0, `Refusing to fetch private network host "${parsedUrl.hostname}".`);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	let response: Response;

	try {
		response = await fetch(parsedUrl, {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
			},
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		const detail =
			error instanceof Error && error.name === 'AbortError'
				? `Request timed out after ${FETCH_TIMEOUT_MS}ms.`
				: `Request failed: ${reason}`;

		return failure(url, 0, detail);
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		return failure(
			url,
			response.status,
			`The site responded with ${response.status} ${response.statusText}. The posting may require a login or block automated requests.`,
		);
	}

	const html = await response.text();
	const posting = extractJsonLdJobPosting(html);
	const rawText = posting?.description ? htmlToText(posting.description) : htmlToText(html);
	const truncated = rawText.length > MAX_TEXT_LENGTH;
	const text = truncated ? rawText.slice(0, MAX_TEXT_LENGTH) : rawText;

	return {
		url,
		finalUrl: response.url || url,
		ok: text.length > 0,
		status: response.status,
		source: posting?.description ? 'json-ld' : text.length > 0 ? 'html' : 'none',
		text,
		truncated,
		title: posting?.title ?? extractTitleTag(html),
		company: organizationName(posting?.hiringOrganization),
		...(text.length === 0
			? {
					error: 'The page returned no readable text. It is likely rendered entirely with JavaScript.',
				}
			: {}),
	};
}

export const fetchJobPostingPageTool = createTool({
	id: 'fetch_job_posting_page',
	description:
		'Fetch a job posting URL over HTTP and return its readable text. Prefers embedded JobPosting structured data and falls back to the page HTML. Never throws — inspect `ok` and `error` to see whether retrieval succeeded.',
	inputSchema: z.object({
		url: z.string().describe('The job posting URL to retrieve'),
	}),
	outputSchema: jobPostingPageSchema,
	execute: async ({ url }) => fetchJobPostingPage(url),
});
