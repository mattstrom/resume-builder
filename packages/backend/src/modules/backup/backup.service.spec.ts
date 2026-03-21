import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { BackupService } from './backup.service';

describe('BackupService', () => {
	let service: BackupService;
	let mockConnection: any;
	const testBackupDir = path.join(__dirname, '__test_backups__');

	const mockCollections = [{ name: 'resumes' }, { name: 'jobs' }];

	const mockDocuments = [
		{ _id: '1', name: 'Test Resume' },
		{ _id: '2', name: 'Another Resume' },
	];

	beforeEach(async () => {
		mockConnection = {
			db: {
				listCollections: jest.fn().mockReturnValue({
					toArray: jest.fn().mockResolvedValue(mockCollections),
				}),
				collection: jest.fn().mockReturnValue({
					find: jest.fn().mockReturnValue({
						toArray: jest.fn().mockResolvedValue(mockDocuments),
					}),
				}),
				databaseName: 'resume-builder-test',
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BackupService,
				{
					provide: getConnectionToken(),
					useValue: mockConnection,
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							const config: Record<string, any> = {
								'backup.dir': testBackupDir,
								'backup.retentionDays': 7,
								'backup.enabled': true,
							};
							return config[key];
						}),
					},
				},
			],
		}).compile();

		service = module.get<BackupService>(BackupService);
	});

	afterEach(() => {
		if (fs.existsSync(testBackupDir)) {
			fs.rmSync(testBackupDir, { recursive: true, force: true });
		}
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('createBackup', () => {
		it('should create backup directory with collection JSON files', async () => {
			const backupPath = await service.createBackup();

			expect(fs.existsSync(backupPath)).toBe(true);
			expect(fs.existsSync(path.join(backupPath, 'resumes.json'))).toBe(
				true,
			);
			expect(fs.existsSync(path.join(backupPath, 'jobs.json'))).toBe(
				true,
			);
			expect(fs.existsSync(path.join(backupPath, '_metadata.json'))).toBe(
				true,
			);

			const resumes = JSON.parse(
				fs.readFileSync(path.join(backupPath, 'resumes.json'), 'utf-8'),
			);
			expect(resumes).toEqual(mockDocuments);

			const metadata = JSON.parse(
				fs.readFileSync(
					path.join(backupPath, '_metadata.json'),
					'utf-8',
				),
			);
			expect(metadata.collections).toEqual(['resumes', 'jobs']);
			expect(metadata.databaseName).toBe('resume-builder-test');
		});

		it('should throw if database connection is not available', async () => {
			mockConnection.db = null;

			await expect(service.createBackup()).rejects.toThrow(
				'Database connection not available',
			);
		});
	});

	describe('cleanOldBackups', () => {
		it('should remove backups older than retention period', async () => {
			const oldBackupDir = path.join(testBackupDir, 'backup-old');
			const newBackupDir = path.join(testBackupDir, 'backup-new');

			fs.mkdirSync(oldBackupDir, { recursive: true });
			fs.mkdirSync(newBackupDir, { recursive: true });

			// Set old backup to 10 days ago
			const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
			fs.utimesSync(oldBackupDir, tenDaysAgo, tenDaysAgo);

			await service.cleanOldBackups();

			expect(fs.existsSync(oldBackupDir)).toBe(false);
			expect(fs.existsSync(newBackupDir)).toBe(true);
		});

		it('should do nothing if backup directory does not exist', async () => {
			// Remove backup dir if it exists
			if (fs.existsSync(testBackupDir)) {
				fs.rmSync(testBackupDir, { recursive: true, force: true });
			}

			await expect(service.cleanOldBackups()).resolves.not.toThrow();
		});
	});

	describe('handleScheduledBackup', () => {
		it('should skip backup when disabled', async () => {
			// Recreate with disabled config
			const module: TestingModule = await Test.createTestingModule({
				providers: [
					BackupService,
					{
						provide: getConnectionToken(),
						useValue: mockConnection,
					},
					{
						provide: ConfigService,
						useValue: {
							get: jest.fn((key: string) => {
								const config: Record<string, any> = {
									'backup.dir': testBackupDir,
									'backup.retentionDays': 7,
									'backup.enabled': false,
								};
								return config[key];
							}),
						},
					},
				],
			}).compile();

			const disabledService = module.get<BackupService>(BackupService);
			await disabledService.handleScheduledBackup();

			// Should not have created any backup directory
			expect(fs.existsSync(testBackupDir)).toBe(false);
		});
	});
});
