import convict from 'convict';

export interface Config {
	auth0: {
		clientId: string;
		domain: string;
		audience: string;
	};
	frontend: {
		baseUrl: string;
		previewPath: string;
		exportPath: string;
	};
	mongodb: {
		uri: string;
		database: string;
	};
	postgres: {
		host: string;
		user: string;
		password: string;
		database: string;
	};
	llms: {
		anthropic: {
			apiKey: string;
		};
		defaultModel: string;
	};
}

const schema = convict<Config>({
	auth0: {
		clientId: {
			doc: 'Auth0 client ID',
			format: String,
			default: '',
			env: 'AUTH0_CLIENT_ID',
		},
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
	frontend: {
		baseUrl: {
			doc: 'The base URL of the frontend application',
			format: String,
			default: 'http://localhost:5173',
		},
		previewPath: {
			doc: 'The preview URL of the frontend application',
			format: String,
			default: '/preview/{resumeId}',
		},
		exportPath: {
			doc: 'The preview URL of the frontend application',
			format: String,
			default: '/export/{resumeId}',
		},
	},
	mongodb: {
		uri: {
			doc: 'MongoDB connection URI',
			format: String,
			default: '',
			env: 'MONGODB_URI',
		},
		database: {
			doc: 'MongoDB database name',
			format: String,
			default: 'vector-store',
			env: 'MONGODB_DATABASE',
		},
	},
	postgres: {
		host: {
			doc: 'PostgreSQL host',
			format: String,
			default: 'localhost',
			env: 'POSTGRES_HOST',
		},
		user: {
			doc: 'PostgreSQL user',
			format: String,
			default: 'postgres',
			env: 'POSTGRES_USER',
		},
		password: {
			doc: 'PostgreSQL password',
			format: String,
			default: '',
			env: 'POSTGRES_PASSWORD',
			sensitive: true,
		},
		database: {
			doc: 'PostgreSQL database name',
			format: String,
			default: 'resume-builder',
			env: 'POSTGRES_DB',
		},
	},
	llms: {
		defaultModel: {
			doc: 'Default LLM model',
			format: String,
			default: 'anthropic/claude-sonnet-4-6',
			env: 'DEFAULT_LLM_MODEL',
		},
		anthropic: {
			apiKey: {
				doc: 'Anthropic API key',
				format: String,
				default: '',
				env: 'ANTHROPIC_API_KEY',
				sensitive: true,
			},
		},
	},
});

export const configuration = schema.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
