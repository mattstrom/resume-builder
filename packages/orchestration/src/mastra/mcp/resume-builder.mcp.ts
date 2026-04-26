import { MCPClient } from '@mastra/mcp';

export const resumeBuilderMcpClient = new MCPClient({
	id: 'resume-builder-mcp-client',
	servers: {
		resumeBuilder: {
			url: new URL(`http://localhost:3000/mcp`),
			requestInit: {
				headers: {
					Authorization: `Bearer ${process.env.RESUME_BUILDER_TOKEN}`,
				},
			},
		},
	},
});
