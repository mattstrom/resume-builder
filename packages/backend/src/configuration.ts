import config from 'config';
import convict from 'convict';

export interface Config {
	anthropicApiKey: string;
	mongodb: {
		uri: string;
	};
	backup: {
		enabled: boolean;
		dir: string;
		retentionDays: number;
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
	backup: {
		enabled: {
			doc: 'Enable periodic MongoDB backups',
			format: Boolean,
			default: true,
			env: 'BACKUP_ENABLED',
		},
		dir: {
			doc: 'Directory to store backup files',
			format: String,
			default: './backups',
			env: 'BACKUP_DIR',
		},
		retentionDays: {
			doc: 'Number of days to retain backup files',
			format: Number,
			default: 7,
			env: 'BACKUP_RETENTION_DAYS',
		},
	},
});

export const configuration = schema
	.load(config.util.toObject())
	.validate({ allowed: 'strict' });

export default configuration.getProperties() as Config;
