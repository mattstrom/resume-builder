import { AgentBrowser } from '@mastra/agent-browser';

import config from '@/config';

export const browser = new AgentBrowser(
	config.browser.cdpUrl
		? { cdpUrl: config.browser.cdpUrl, scope: 'shared' }
		: { headless: config.browser.headless },
);
