import { Injectable, Inject } from '@nestjs/common';
import { RequestSigningKey } from './tokens';
import * as crypto from 'crypto';

interface HeaderValues {
	nonce: string;
	signature: string;
	timestamp: string;
}

/**
 * Service to sign requests using HMAC signature and nonce. The signing key is obtained from AWS SSM.
 *
 * @remarks
 * This is used for machine-to-machine authentication, such as for HTTP requests made in background
 * jobs or in scenarios where JWT tokens are not available because storing them would be insecure.
 */
@Injectable()
export class RequestSigningService {
	constructor(
		@Inject(RequestSigningKey) private readonly signingKey: string,
	) {}

	/**
	 * Generate a random nonce and sign it using the signing key.
	 */
	sign(): HeaderValues {
		const nonce = this.generateRandomString(32);
		const timestamp = Date.now().toString();
		const signature = crypto
			.createHmac('sha256', this.signingKey)
			.update(`${nonce}:${timestamp}`)
			.digest('hex'); // change to base64 if needed

		return { nonce, signature, timestamp };
	}

	/**
	 * Returns HMAC signature headers.
	 *
	 * @remarks
	 * These headers should be merged into the headers of HTTP requests.
	 */
	getSigningHeaders() {
		const { nonce, signature, timestamp } = this.sign();
		return {
			'x-nonce': nonce,
			'x-signature': signature,
			'x-timestamp': timestamp,
		};
	}

	private generateRandomString(length: number): string {
		const characters =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;
		const bytes = crypto.randomBytes(length);
		let result = '';
		for (let i = 0; i < length; i++) {
			result += characters.charAt(bytes[i] % charactersLength);
		}

		return result;
	}
}
