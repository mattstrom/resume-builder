import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService) {
		const domain = configService.get<string>('auth0.domain');
		const audience = configService.get<string>('auth0.audience')!;
		const localAudience = configService.get<string>('auth0.localAudience');

		super({
			secretOrKeyProvider: passportJwtSecret({
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 5,
				jwksUri: `https://${domain}/.well-known/jwks.json`,
			}),
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			audience: localAudience ? [audience, localAudience] : audience,
			issuer: `https://${domain}/`,
			algorithms: ['RS256'],
		});
	}

	validate(payload: Record<string, unknown>) {
		return payload;
	}
}
