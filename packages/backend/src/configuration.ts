import config from 'config';
import convict from 'convict';

export interface Config {
	anthropicApiKey: string;
	auth0: {
		domain: string;
		audience: string;
	};
	mongodb: {
		uri: string;
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
	anthropicApiKey: {
		doc: 'Anthropic API key for AI chat',
		format: String,
		default: '',
		env: 'ANTHROPIC_API_KEY',
		sensitive: true,
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
});

export const configuration = schema
	.load(config.util.toObject())
	.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
