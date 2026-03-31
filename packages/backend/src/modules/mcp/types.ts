import { type RequestHandlerExtra } from '@nestjs-mcp/server';
import { Auth0User } from '../auth';

export type McpToolParams<
	T extends Record<string, unknown> = Record<string, unknown>,
> = T;

export interface McpExtra extends RequestHandlerExtra {
	user: Auth0User;
}
