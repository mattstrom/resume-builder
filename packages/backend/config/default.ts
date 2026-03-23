import { type Config } from '@/config';

const config: Config = {
	auth0: {
		domain: 'login.mattstrom.com',
		audience: 'https://resume-builder.mattstrom.com',
	},
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
	},
	anthropicApiKey: '',
};

export default config;
