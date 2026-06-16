import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		return super.canActivate(context);
	}

	getRequest(context: ExecutionContext) {
		if (context.getType() === 'http') {
			return context.switchToHttp().getRequest();
		}

		const ctx = GqlExecutionContext.create(context);

		return ctx.getContext().req;
	}

	override handleRequest<TUser = unknown>(
		err: any,
		user: any,
		_info: any,
		context: ExecutionContext,
	): TUser {
		if (!err && user) {
			return user;
		}

		if (context.getType() === 'http') {
			const request = context.switchToHttp().getRequest();
			const response = context.switchToHttp().getResponse();
			const resourceMetadataUrl = `${request.protocol}://${request.get('host')}/.well-known/oauth-protected-resource`;

			response.setHeader(
				'WWW-Authenticate',
				`Bearer error="unauthorized", error_description="Authorization required", resource_metadata="${resourceMetadataUrl}"`,
			);
		}

		throw err instanceof Error ? err : new UnauthorizedException();
	}
}
