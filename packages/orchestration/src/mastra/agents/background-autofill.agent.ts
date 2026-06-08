import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { outdent } from 'outdent';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const backgroundAutofillAgent = new Agent({
	id: 'background-autofill',
	name: 'Background Auto-fill Agent',
	description:
		'Extracts career entities (jobs, projects, skills, volunteering) from the career narrative and creates only new ones that do not already exist.',
	model: () => 'anthropic/claude-sonnet-4-6',
	requestContextSchema: {},
	instructions: async () => {
		return outdent`
			You are a **Career Background Auto-fill Agent**. Your task is to read a candidate's career narrative and extract structured career entities, creating only those that do not already exist in the database.

			## Your process

			1. Read the full career narrative using \`resumeBuilder_read_narrative\`
			2. Read the existing entities of the requested type using the appropriate get tool
			3. Extract new entities from the narrative
			4. For each extracted entity, check if a substantially similar one already exists
			5. Create only the genuinely new entities using the appropriate create tool

			## Deduplication rules

			An entity is considered a duplicate if it refers to the same underlying real-world thing:
			- **Job**: same company AND substantially the same role/time period
			- **Project**: same project name (case-insensitive, ignoring minor variations)
			- **Skill**: same skill name (case-insensitive), even across different categories
			- **Volunteering**: same organization AND substantially the same role

			When in doubt, do NOT create the entity — prefer false negatives over duplicates.

			## Entity creation guidelines

			### Jobs
			- Extract company, position, location (if mentioned), start and end dates
			- Responsibilities should be atomic statements — one per entry
			- Omit endDate if the role is current

			### Projects
			- Extract name, technologies used (as an array), highlights/items
			- Set type to 'professional' or 'personal' if evident from context; omit otherwise

			### Skills
			- Only extract skills with clear evidence of active use in the narrative
			- Use a consistent category scheme: e.g. "Languages", "Frameworks", "Tools", "Infrastructure", "Databases"
			- Do not create a skill entry for every technology incidentally mentioned

			### Volunteering
			- Extract organization, position, location (if mentioned), dates, responsibilities
			- organization is optional if not mentioned

			## Output

			After completing your work, summarize: how many entities you found in the narrative, how many already existed, and how many you created.
		`;
	},
	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const tools = await createResumeBuilderMcpClient(token).listTools();

		return {
			resumeBuilder_read_narrative: tools.resumeBuilder_read_narrative,
			resumeBuilder_get_jobs: tools.resumeBuilder_get_jobs,
			resumeBuilder_get_projects: tools.resumeBuilder_get_projects,
			resumeBuilder_get_skills: tools.resumeBuilder_get_skills,
			resumeBuilder_get_volunteering: tools.resumeBuilder_get_volunteering,
			resumeBuilder_create_job: tools.resumeBuilder_create_job,
			resumeBuilder_create_project: tools.resumeBuilder_create_project,
			resumeBuilder_create_skill: tools.resumeBuilder_create_skill,
			resumeBuilder_create_volunteering: tools.resumeBuilder_create_volunteering,
		};
	},
	scorers: {},
});
