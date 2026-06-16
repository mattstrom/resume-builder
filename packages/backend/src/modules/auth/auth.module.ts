import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
	controllers: [AuthController],
	providers: [JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
	exports: [PassportModule],
})
export class AuthModule {}
