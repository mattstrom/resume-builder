import { type Config } from '@/config';

const config: Config = {
	mongodb: {
		uri: 'mongodb://localhost:27017/resume-builder',
	},
	anthropicApiKey: '',
	backup: {
		enabled: true,
		dir: './backups',
		retentionDays: 7,
	},
};

export default config;
