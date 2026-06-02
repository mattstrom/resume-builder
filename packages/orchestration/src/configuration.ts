import config from 'config';
import convict from 'convict';

export interface Config {
	auth0: {
		clientId: string;
		domain: string;
		audience: string;
	};
	mongodb: {
		uri: string;
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
			},
		},
	},
});

export const configuration = schema.load(config.util.toObject()).validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
