import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { outdent } from 'outdent';
import { z } from 'zod';

export const requestContextSchema = z.object({
	[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	frontend: z.object({
		baseUrl: z.string(),
		previewPath: z.string(),
		exportPath: z.string(),
	}),
});

export type RequestContext = z.infer<typeof requestContextSchema>;

/**
 * Header the frontend sends carrying the resume sections the user has selected
 * in the inspector, and the requestContext key the middleware stores them under
 * so agents can read them in their dynamic instructions.
 */
export const FOCUSED_PATHS_HEADER = 'x-focused-paths';
export const FOCUSED_PATHS_KEY = 'focusedPaths';

/** A resume section the user has selected to focus the chat agent on. */
export interface FocusedRegion {
	path: string;
	label: string;
}

/** Minimal shape of the Mastra requestContext we read from. */
interface ReadableRequestContext {
	get(key: string): unknown;
}

/**
 * Parse the `X-Focused-Paths` header value (URI-encoded JSON) into a list of
 * focused regions. Returns an empty array for missing or malformed input.
 */
export function parseFocusedPaths(headerValue?: string | null): FocusedRegion[] {
	if (!headerValue) {
		return [];
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(headerValue));
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter(
			(region): region is FocusedRegion =>
				typeof region?.path === 'string' && typeof region?.label === 'string',
		);
	} catch {
		return [];
	}
}

/**
 * Render a focus instruction block from the requestContext, or an empty string
 * when no sections are focused. Appended to agent instructions so the agent
 * prioritizes the user's selected resume sections.
 */
export function renderFocusBlock(requestContext: ReadableRequestContext): string {
	const regions = (requestContext.get(FOCUSED_PATHS_KEY) as FocusedRegion[]) ?? [];
	if (regions.length === 0) {
		return '';
	}

	const items = regions.map((region) => `- ${region.label} (\`${region.path}\`)`).join('\n');

	return outdent`

		## Current focus

		The user has selected these resume sections to focus on:

		${items}

		Prioritize your help and any edits on these sections; you may still address
		closely related content or clearly general requests. When you delegate,
		pass these focused sections to the specialist.
	`;
}
