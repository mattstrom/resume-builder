import { type Config } from '@/config';

const config: Config = {
	auth0: {
		clientId: '',
		domain: 'login.mattstrom.com',
		audience: 'https://resume-builder.mattstrom.com',
	},
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
		database: 'vector-store',
	},
	llms: {
		defaultModel: 'anthropic/claude-sonnet-4-6',
	},
};

export default config;
