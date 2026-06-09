import { type Tool } from '@mastra/core/tools';
import { MCPClient } from '@mastra/mcp';

type Tools =
	| 'get_applications'
	| 'get_application'
	| 'create_application'
	| 'update_analysis'
	| 'read_narrative'
	| 'edit_narrative'
	| 'get_profile'
	| 'get_resumes'
	| 'get_resume'
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
		super({
			id: 'resume-builder-mcp-client',
			servers: {
				resumeBuilder: {
					url: new URL(`http://localhost:3000/mcp`),
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
	return new ResumeBuilderMCPClient(token);
}
