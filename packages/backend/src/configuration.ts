import config from 'config';
import convict from 'convict';

export interface Config {
	anthropicApiKey: string;
	mongodb: {
		uri: string;
	};
}

const schema = convict<Config>({
	anthropicApiKey: {
		doc: 'Anthropic API key for AI chat',
		format: String,
		default: '',
		env: 'ANTHROPIC_API_KEY',
	},
	mongodb: {
		uri: {
			doc: 'MongoDB connection URI',
			format: String,
			default: '',
			env: 'MONGODB_URI',
		},
	},
});

export const configuration = schema
	.load(config.util.toObject())
	.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
