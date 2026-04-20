import config from 'config';
import convict from 'convict';

export interface ModelInfo {
	name: string;
	label: string;
}

export interface Config {
	llms: {
		anthropic: {
			apiKey: string;
			models: ModelInfo[];
		};
		ollama: {
			host: string;
			models: ModelInfo[];
		};
		lmStudio: {
			host: string;
			models: ModelInfo[];
		};
		defaultLlm: {
			provider: string;
			model: string;
		};
		jobAssessment: {
			provider: string;
			model: string;
		};
		narrativeSummarizer: {
			provider: string;
			model: string;
		};
	};
	auth0: {
		domain: string;
		audience: string;
	};
	mongodb: {
		uri: string;
	};
	redis: {
		url: string;
	};
	crdt: {
		url: string;
		httpUrl: string;
		internalKey: string;
	};
}

const schema = convict<Config>({
	auth0: {
		domain: {
			doc: 'Auth0 tenant domain (e.g., your-tenant.auth0.com)',
			format: String,
			default: 'login.mattstrom.com',
			env: 'AUTH0_DOMAIN',
		},
		audience: {
			doc: 'Auth0 API audience identifier',
			format: String,
			default: 'https://resume-builder.mattstrom.com',
			env: 'AUTH0_AUDIENCE',
		},
	},
	llms: {
		anthropic: {
			apiKey: {
				doc: 'Anthropic API key for AI chat',
				format: String,
				default: '',
				env: 'ANTHROPIC_API_KEY',
				sensitive: true,
			},
			models: {
				doc: 'List of available Anthropic models',
				format: Array,
				default: [],
			},
		},
		ollama: {
			host: {
				doc: 'Ollama server host URL',
				format: String,
				default: 'http://localhost:11434',
				env: 'OLLAMA_HOST',
			},
			models: {
				doc: 'List of available Ollama models',
				format: Array,
				default: [],
			},
		},
		lmStudio: {
			host: {
				doc: 'LM Studio server host URL',
				format: String,
				default: 'http://localhost:1234',
				env: 'LMSTUDIO_HOST',
			},
			models: {
				doc: 'List of available LM Studio models',
				format: Array,
				default: [],
			},
		},
		defaultLlm: {
			provider: {
				doc: 'Default LLM provider (anthropic | ollama)',
				format: String,
				default: 'anthropic',
				env: 'DEFAULT_LLM_PROVIDER',
			},
			model: {
				doc: 'Default LLM model name',
				format: String,
				default: 'claude-haiku-4-5-20251001',
				env: 'DEFAULT_LLM_MODEL',
			},
		},
		jobAssessment: {
			provider: {
				doc: 'LLM provider to use for job assessment (anthropic | ollama)',
				format: String,
				default: 'anthropic',
				env: 'JOB_ASSESSMENT_LLM_PROVIDER',
			},
			model: {
				doc: 'LLM model to use for job assessment',
				format: String,
				default: 'claude-sonnet-4-6',
				env: 'JOB_ASSESSMENT_LLM_MODEL',
			},
		},
		narrativeSummarizer: {
			provider: {
				doc: 'LLM provider to use for narrative summarization (anthropic | ollama)',
				format: String,
				default: 'anthropic',
				env: 'NARRATIVE_SUMMARIZER_LLM_PROVIDER',
			},
			model: {
				doc: 'LLM model to use for narrative summarization',
				format: String,
				default: 'claude-sonnet-4-6',
				env: 'NARRATIVE_SUMMARIZER_LLM_MODEL',
			},
		},
	},
	mongodb: {
		uri: {
			doc: 'MongoDB connection URI',
			format: String,
			default: '',
			env: 'MONGODB_URI',
			sensitive: true,
		},
	},
	redis: {
		url: {
			doc: 'Redis connection URL for BullMQ',
			format: String,
			default: 'redis://localhost:6379',
			env: 'REDIS_URL',
		},
	},
	crdt: {
		url: {
			doc: 'Hocuspocus CRDT server WebSocket URL',
			format: String,
			default: 'ws://localhost:1234',
			env: 'CRDT_URL',
		},
		httpUrl: {
			doc: 'Hocuspocus CRDT server HTTP URL for internal API',
			format: String,
			default: 'http://localhost:1234',
			env: 'CRDT_HTTP_URL',
		},
		internalKey: {
			doc: 'Shared secret for CRDT internal HTTP API',
			format: String,
			default: '',
			env: 'CRDT_INTERNAL_KEY',
			sensitive: true,
		},
	},
});

export const configuration = schema
	.load(config.util.toObject())
	.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
