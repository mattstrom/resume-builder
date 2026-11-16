import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import config from '@/config';

import { publicOrigin } from './public-url.js';
import { Public } from './public.decorator.js';

@Controller()
export class AuthController {
	@Public()
	@Get('.well-known/oauth-protected-resource')
	async oauthProtectedResource(@Req() request: Request) {
		return {
			resource: publicOrigin(request),
			authorization_servers: [`https://${config.auth0.domain}/`],
			bearer_methods_supported: ['header'],
			scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
		};
	}
}
