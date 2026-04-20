import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

import configuration from '../../configuration';

@Injectable()
export class CrdtSigningService {
	private readonly signingKey = configuration.crdt.internalKey;

	getSigningHeaders(): Record<string, string> {
		const nonce = crypto.randomBytes(16).toString('hex');
		const ts = Date.now().toString();
		const signature = crypto
			.createHmac('sha256', this.signingKey)
			.update(`${nonce}:${ts}`)
			.digest('hex');

		return {
			'x-nonce': nonce,
			'x-timestamp': ts,
			'x-signature': signature,
		};
	}
}
