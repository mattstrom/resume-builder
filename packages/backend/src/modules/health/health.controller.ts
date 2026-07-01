import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

import { Public } from '../auth/index.js';
import { PrismaService } from '../prisma/index.js';

@Public()
@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private prismaIndicator: PrismaHealthIndicator,
		private prisma: PrismaService,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([() => this.prismaIndicator.pingCheck('postgres', this.prisma)]);
	}
}
