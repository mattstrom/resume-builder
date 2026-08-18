import { randomUUID } from 'node:crypto';

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
	constructor(token: string) {
		const url = process.env['RESUME_BUILDER_MCP_URL'] ?? 'http://localhost:3000/mcp';

		super({
			// A fresh id per instance, deliberately not a shared constant: MCPClient
			// dedupes instances that share an id *and* an identical server config
			// (same URL, same headers), which would otherwise hand two unrelated
			// callers with the same bearer token the same live connection — and
			// then disconnecting when one caller is done would break the other.
			// Every caller here creates, uses, and disposes of its own client
			// within one function scope, so nothing depends on that reuse.
			id: `resume-builder-mcp-client-${randomUUID()}`,
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

	listTools(): Promise<ResumeBuilderMCPTools> {
		return super.listTools() as Promise<ResumeBuilderMCPTools>;
	}
}

export function createResumeBuilderMcpClient(token: string): ResumeBuilderMCPClient {
	if (!token) {
		// A connection opened without a token will fail to authenticate, and the
		// streamable transport retries a failed connection indefinitely (~1/sec)
		// rather than giving up — so a client created this way never dies on its
		// own and must never be created in the first place. Every instance below
		// gets its own id precisely so unrelated callers never share one client;
		// that also means nothing here would ever notice or reuse a prior bad
		// attempt, so failing fast is the only thing that bounds this.
		throw new Error('Cannot create the resume-builder MCP client without an auth token');
	}

	return new ResumeBuilderMCPClient(token);
}

/**
 * Runs `fn` against the resume-builder MCP toolset for `token`, disconnecting
 * the client afterward regardless of outcome.
 *
 * Only safe for a single sequential caller. `MCPClient` dedupes instances by
 * (id, server config), so concurrent callers sharing the same token — e.g.
 * `.parallel()` branches — receive the *same* underlying connection; the first
 * one to finish would disconnect it out from under the others. Workflows that
 * fetch resume-builder tools in parallel must not use this helper.
 */
export async function withResumeBuilderTools<T>(
	token: string,
	fn: (tools: ResumeBuilderMCPToolsets['resumeBuilder']) => Promise<T>,
): Promise<T> {
	const client = createResumeBuilderMcpClient(token);

	try {
		const { toolsets, errors } = await client.listToolsetsWithErrors();
		const tools = toolsets['resumeBuilder'];

		if (!tools) {
			const reason = errors['resumeBuilder'] ?? 'connection failed';
			throw new Error(`Could not reach the resume-builder MCP server: ${reason}`);
		}

		return await fn(tools);
	} finally {
		await client.disconnect();
	}
}
