import config from 'config';
import convict from 'convict';

export interface Config {
	NODE_ENV: 'development' | 'production';
	auth0: {
		domain: string;
	};
}

const schema = convict<Config>({
	NODE_ENV: {
		format: ['development', 'production'],
		default: 'development',
		env: 'NODE_ENV',
	},
	auth0: {
		domain: {
			format: String,
			default: '',
			env: 'AUTH0_DOMAIN',
		},
	},
});

export const configuration = schema
	.load(config.util.toObject())
	.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
