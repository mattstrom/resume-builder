import { Agent } from '@mastra/core/agent';
import { browser } from '../browsers';

export const webAgent = new Agent({
	id: 'web-agent',
	name: 'Web Agent',
	model: 'anthropic/claude-sonnet-4-6',
	browser,
	instructions:
		'You are a web automation assistant. Use browser tools to navigate websites and complete tasks.',
});
