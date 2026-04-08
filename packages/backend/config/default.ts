import { type Config } from '@/config';

const config: Config = {
	auth0: {
		domain: 'login.mattstrom.com',
		audience: 'https://resume-builder.mattstrom.com',
	},
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
	},
	llms: {
		anthropic: {
			apiKey: '',
		},
		ollama: {
			host: 'http://localhost:11434',
		},
		defaultLlm: {
			provider: 'ollama',
			// model: 'llama3.2',
			model: 'qwen3.5',
		},
	},
};

export default config;
