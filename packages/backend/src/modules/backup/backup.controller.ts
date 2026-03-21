import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

import { BackupService } from './backup.service';

@Controller('api/backups')
export class BackupController {
	constructor(private readonly backupService: BackupService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	async triggerBackup(): Promise<{ path: string }> {
		const backupPath = await this.backupService.createBackup();
		return { path: backupPath };
	}

	@Post('clean')
	@HttpCode(HttpStatus.OK)
	async cleanOldBackups(): Promise<{ message: string }> {
		await this.backupService.cleanOldBackups();
		return { message: 'Old backups cleaned successfully' };
	}
}
