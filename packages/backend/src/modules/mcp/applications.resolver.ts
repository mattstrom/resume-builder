import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, SessionManager, Tool } from '@nestjs-mcp/server';
import { InjectModel } from '@nestjs/mongoose';
import { Application, applicationInputSchema } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Resolver()
export class ApplicationsResolver {
	constructor(
		private readonly sessionManager: SessionManager,
		@InjectModel(Application.name)
		private readonly applicationModel: Model<Application>,
	) {}

	@Tool({
		name: 'get_applications',
		description: 'Retrieve all job applications and their analyses',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getApplications(): Promise<CallToolResult> {
		const applications = await this.applicationModel.find().exec();

		return {
			content: [
				{
					type: 'text',
					text: `Found ${applications.length} applications.`,
				},
			],
			structuredContent: {
				applications,
			},
		};
	}

	@Tool({
		name: 'save_application',
		description:
			'Saves a job application with analysis of skill fit, strengths, weaknesses, and relevance scores',
		paramsSchema: { application: applicationInputSchema },
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async saveApplication({ application }: { application: Application }) {
		const savedApplication = await this.applicationModel.create({
			...application,
			uid: 'auth0|69c19214515fd097660fb597',
		});

		return {
			content: [
				{
					type: 'text',
					text: `Application saved successfully. ID: ${savedApplication._id}`,
				},
			],
			structuredContent: {
				application: savedApplication,
			},
		};
	}
}
