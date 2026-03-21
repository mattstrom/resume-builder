import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class BackupService implements OnModuleInit {
	private readonly logger = new Logger(BackupService.name);
	private readonly backupDir: string;
	private readonly retentionDays: number;
	private readonly enabled: boolean;

	constructor(
		@InjectConnection() private readonly connection: Connection,
		private readonly configService: ConfigService,
	) {
		this.backupDir =
			this.configService.get<string>('backup.dir') ?? './backups';
		this.retentionDays =
			this.configService.get<number>('backup.retentionDays') ?? 7;
		this.enabled =
			this.configService.get<boolean>('backup.enabled') ?? true;
	}

	onModuleInit() {
		if (this.enabled) {
			this.logger.log(
				`Backup service initialized. Directory: ${this.backupDir}, Retention: ${this.retentionDays} days`,
			);
		} else {
			this.logger.log('Backup service is disabled');
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async handleScheduledBackup(): Promise<void> {
		if (!this.enabled) {
			return;
		}

		this.logger.log('Starting scheduled backup...');
		try {
			const backupPath = await this.createBackup();
			this.logger.log(`Backup completed: ${backupPath}`);

			await this.cleanOldBackups();
		} catch (error) {
			this.logger.error('Scheduled backup failed', error);
		}
	}

	async createBackup(): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupPath = path.resolve(this.backupDir, `backup-${timestamp}`);

		fs.mkdirSync(backupPath, { recursive: true });

		const db = this.connection.db;
		if (!db) {
			throw new Error('Database connection not available');
		}

		const collections = await db.listCollections().toArray();

		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name;
			const collection = db.collection(collectionName);
			const documents = await collection.find({}).toArray();

			const filePath = path.join(backupPath, `${collectionName}.json`);
			fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

			this.logger.debug(
				`Backed up ${documents.length} documents from ${collectionName}`,
			);
		}

		const metadata = {
			timestamp: new Date().toISOString(),
			collections: collections.map((c) => c.name),
			databaseName: db.databaseName,
		};
		fs.writeFileSync(
			path.join(backupPath, '_metadata.json'),
			JSON.stringify(metadata, null, 2),
		);

		return backupPath;
	}

	async cleanOldBackups(): Promise<void> {
		const backupDir = path.resolve(this.backupDir);

		if (!fs.existsSync(backupDir)) {
			return;
		}

		const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
		const entries = fs.readdirSync(backupDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory() || !entry.name.startsWith('backup-')) {
				continue;
			}

			const entryPath = path.join(backupDir, entry.name);
			const stat = fs.statSync(entryPath);

			if (stat.mtimeMs < cutoff) {
				fs.rmSync(entryPath, { recursive: true, force: true });
				this.logger.log(`Removed old backup: ${entry.name}`);
			}
		}
	}
}
