import { type Config } from '@/config';

const config: Config = {
	auth0: {
		domain: 'dev-qvt147eqvh1z2jc7.us.auth0.com',
		audience: 'https://resume-builder.mattstrom.com',
	},
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
	},
	anthropicApiKey: '',
};

export default config;
