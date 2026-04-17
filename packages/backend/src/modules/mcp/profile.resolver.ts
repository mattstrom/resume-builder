import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';

import { ProfilesService } from '../entities/profiles/profiles.service';
import { McpGuard } from './mcp.guard';
import { type McpExtra } from './types';

@Resolver()
@UseGuards(McpGuard)
export class ProfileResolver {
	constructor(private profilesService: ProfilesService) {}

	@Tool({
		name: 'get_profile',
		description:
			"Retrieve the current user's profile, including their narrative description",
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getProfile({ user }: McpExtra): Promise<CallToolResult> {
		const profile = await this.profilesService.findOne(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: `${JSON.stringify(profile, null, 2)}`,
				},
			],
			structuredContent: { profile },
		};
	}
}
