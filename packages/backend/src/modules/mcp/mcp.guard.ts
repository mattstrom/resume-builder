import { CanActivate, Injectable } from '@nestjs/common';
import { McpExecutionContext, SessionManager } from '@nestjs-mcp/server';

@Injectable()
export class McpGuard implements CanActivate {
	constructor(private readonly sessionManager: SessionManager) {}

	// @ts-expect-error ExecutionContext type difference
	canActivate(context: McpExecutionContext): boolean {
		const sessionId = context.getSessionId();

		if (!sessionId) {
			return false;
		}

		const handlerArgs = context.getArgs();
		const session = this.sessionManager.getSession(sessionId);
		const request = session?.request;

		const user = request?.user;

		if (!user) {
			return false;
		}

		handlerArgs.extra['user'] = user;

		return true;
	}
}
