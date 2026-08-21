import { createHash } from 'node:crypto';

import { type Tool } from '@mastra/core/tools';
import { MCPClient } from '@mastra/mcp';

type Tools =
	| 'get_applications'
	| 'get_application'
	| 'create_application'
	| 'update_analysis'
	| 'update_job_description'
	| 'upsert_flow_run'
	| 'get_flow_runs'
	| 'read_narrative'
	| 'edit_narrative'
	| 'get_profile'
	| 'get_resumes'
	| 'get_resume'
	| 'patch_resume'
	| 'save_resume'
	| 'get_contact_information'
	| 'get_jobs'
	| 'get_education'
	| 'get_projects'
	| 'get_skills'
	| 'get_volunteering'
	| 'get_cover_letters'
	| 'get_cover_letter'
	| 'save_cover_letter'
	| 'get_schemas'
	| 'get_schema_names'
	| 'lookup_schema'
	| 'read_preferences'
	| 'edit_preferences'
	| 'get_facts'
	| 'get_fact'
	| 'create_facts'
	| 'update_fact'
	| 'delete_fact'
	| 'get_fact_concepts'
	| 'upsert_fact_concept'
	| 'get_bullets'
	| 'get_bullet'
	| 'search_profile_evidence'
	| 'upsert_bullet_concept'
	| 'get_expressions'
	| 'create_expression'
	| 'delete_expression'
	| 'get_resume_facts'
	| 'link_fact_to_resume'
	| 'unlink_fact_from_resume'
	| 'get_job_requirements'
	| 'create_job_requirements'
	| 'create_job'
	| 'create_project'
	| 'create_skill'
	| 'create_volunteering';

type ResumeBuilderMCPTools = {
	[key in `resumeBuilder_${Tools}`]: Tool<any, any, any, any>;
};

interface ResumeBuilderMCPToolsets extends Record<
	string,
	Record<string, Tool<any, any, any, any>>
> {
	resumeBuilder: Record<Tools, Tool<any, any, any, any>>;
}

class ResumeBuilderMCPClient extends MCPClient {
	constructor(token: string, id: string) {
		const url =
			process.env['RESUME_BUILDER_MCP_URL'] ??
			'http://localhost:3000/mcp';

		super({
			id,
			servers: {
				resumeBuilder: {
					url: new URL(url),
					requestInit: {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				},
			},
		});
	}

	listToolsets(): Promise<ResumeBuilderMCPToolsets> {
		return super.listToolsets() as Promise<ResumeBuilderMCPToolsets>;
	}
}

interface CachedClient {
	client: ResumeBuilderMCPClient;
	toolsetPromise: Promise<ResumeBuilderMCPToolsets['resumeBuilder']>;
	lastUsedAt: number;
}

/**
 * Keyed by a hash of the bearer token, not the token itself, so this never
 * holds onto raw auth tokens in memory.
 *
 * History: this used to create a brand-new MCPClient (and refetch + reconvert
 * the full ~57-tool schema catalog) on every single call, because a prior
 * version shared one client across all callers and disconnecting it out from
 * under a concurrent caller with the same token caused failures. That traded
 * a correctness bug for a performance one — every workflow step and agent
 * turn paid the full connect+schema-conversion cost, which was cheap in
 * isolation but OOMed the pod under real traffic. Caching per-token and never
 * disconnecting mid-use fixes both: same-token callers now safely share one
 * live connection, and nobody tears it down while another caller might still
 * be using it.
 */
const clientsByToken = new Map<string, CachedClient>();

/** Entries unused for this long are disconnected so the cache doesn't grow
 * without bound across distinct users / token refreshes over process uptime. */
const IDLE_DISCONNECT_MS = 15 * 60 * 1000;

let sweepScheduled = false;

function scheduleIdleSweep(): void {
	if (sweepScheduled) return;
	sweepScheduled = true;

	setInterval(() => {
		const now = Date.now();

		for (const [id, entry] of clientsByToken) {
			if (now - entry.lastUsedAt > IDLE_DISCONNECT_MS) {
				clientsByToken.delete(id);
				entry.client.disconnect().catch(() => {});
			}
		}
	}, IDLE_DISCONNECT_MS).unref();
}

function idForToken(token: string): string {
	return `resume-builder-mcp-client-${createHash('sha256').update(token).digest('hex')}`;
}

/**
 * Returns the cached, still-connecting-or-connected resume-builder toolset
 * for `token`, creating and registering a new one on a cache miss.
 *
 * Synchronous up to the point of caching so concurrent callers with the same
 * token during a cold start observe and await the same in-flight promise
 * rather than racing to create two clients.
 */
function getCachedClient(token: string): CachedClient {
	if (!token) {
		// A connection opened without a token will fail to authenticate, and the
		// streamable transport retries a failed connection indefinitely (~1/sec)
		// rather than giving up — so a client created this way never dies on its
		// own and must never be created in the first place.
		throw new Error(
			'Cannot create the resume-builder MCP client without an auth token',
		);
	}

	scheduleIdleSweep();

	const id = idForToken(token);
	const existing = clientsByToken.get(id);

	if (existing) {
		existing.lastUsedAt = Date.now();
		return existing;
	}

	const client = new ResumeBuilderMCPClient(token, id);
	const toolsetPromise = client
		.listToolsetsWithErrors()
		.then(({ toolsets, errors }) => {
			const tools = toolsets['resumeBuilder'];

			if (!tools) {
				const reason = errors['resumeBuilder'] ?? 'connection failed';
				throw new Error(
					`Could not reach the resume-builder MCP server: ${reason}`,
				);
			}

			return tools;
		});

	const entry: CachedClient = {
		client,
		toolsetPromise,
		lastUsedAt: Date.now(),
	};
	clientsByToken.set(id, entry);

	// Don't cache a failed connection attempt — let the next call retry fresh.
	toolsetPromise.catch(() => {
		clientsByToken.delete(id);
		client.disconnect().catch(() => {});
	});

	return entry;
}

/**
 * Fetches the resume-builder MCP toolset for `token`, reusing a cached,
 * already-connected client when one exists for this token.
 */
export async function getResumeBuilderTools(
	token: string,
): Promise<ResumeBuilderMCPTools> {
	const tools = await getCachedClient(token).toolsetPromise;
	const prefixed = {} as ResumeBuilderMCPTools;

	for (const [name, tool] of Object.entries(tools)) {
		(prefixed as Record<string, Tool<any, any, any, any>>)[
			`resumeBuilder_${name}`
		] = tool;
	}

	return prefixed;
}

/**
 * Runs `fn` against the resume-builder MCP toolset for `token`, reusing a
 * cached, already-connected client when one exists for this token.
 */
export async function withResumeBuilderTools<T>(
	token: string,
	fn: (tools: ResumeBuilderMCPToolsets['resumeBuilder']) => Promise<T>,
): Promise<T> {
	const tools = await getCachedClient(token).toolsetPromise;
	return fn(tools);
}
