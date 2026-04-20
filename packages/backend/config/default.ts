import { type Config } from '@/config';

const config: Config = {
	auth0: {
		domain: 'login.mattstrom.com',
		audience: 'https://resume-builder.mattstrom.com',
	},
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
	},
	redis: {
		url: 'redis://localhost:6379',
	},
	crdt: {
		url: 'ws://localhost:1234',
		httpUrl: 'http://localhost:1234',
		internalKey: 'secret',
	},
	llms: {
		anthropic: {
			apiKey: '',
			models: [
				{
					name: 'claude-haiku-4-5-20251001',
					label: 'Claude Haiku 4.5',
				},
			],
		},
		ollama: {
			host: 'http://localhost:11434',
			models: [
				{ name: 'llama3.2', label: 'Llama 3.2' },
				{ name: 'qwen3.5', label: 'Qwen 3.5' },
			],
		},
		lmStudio: {
			host: 'http://localhost:1234',
			models: [
				{ name: 'gemma-4-31b-it', label: 'Gemma 4.31b (IT)' },
				{ name: 'qwen3.5', label: 'Qwen 3.5' },
			],
		},
		jobAssessment: {
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
		},
		narrativeSummarizer: {
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
		},
		defaultLlm: {
			provider: 'lm-studio',
			model: 'gemma-4-31b-it',
			// provider: 'ollama',
			// model: 'llama3.2',
			// model: 'qwen3.5',
			// model: 'gemma4:31b',
		},
	},
};

export default config;
