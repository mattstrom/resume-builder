import { Controller, Get } from '@nestjs/common';
import {
	HealthCheck,
	HealthCheckService,
	MongooseHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../auth';

@Public()
@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private mongoose: MongooseHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
	}
}
