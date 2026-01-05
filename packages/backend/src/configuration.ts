import config from 'config';
import convict from 'convict';

export interface Config {
	mongodb: {
		uri: string;
	};
}

const schema = convict<Config>({
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
