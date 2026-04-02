import type {
	Extension,
	onAuthenticatePayload,
	onAwarenessUpdatePayload,
	onChangePayload,
	onConnectPayload,
	onCreateDocumentPayload,
	onDestroyPayload,
	onDisconnectPayload,
	onLoadDocumentPayload,
	onRequestPayload,
	onStoreDocumentPayload,
	onUpgradePayload,
} from '@hocuspocus/server';
import { Inject, Injectable } from '@nestjs/common';
import type winston from 'winston';
import { Logger } from './tokens.js';

@Injectable()
export class LoggingService implements Extension {
	constructor(@Inject(Logger) public readonly logger: winston.Logger) {}

	async onConnect(data: onConnectPayload) {
		const { documentName, context } = data;
		this.logger.info('Connection started', {
			docId: documentName,
			context,
		});
	}

	async onAuthenticate(data: onAuthenticatePayload) {
		const { documentName, context } = data;
		this.logger.debug('User authenticated', {
			docId: documentName,
			context,
		});
	}

	async onRequest(data: onRequestPayload) {
		this.logger.debug(`Incoming HTTP Request to ${data.request.url}`);
	}

	async onDisconnect({ documentName, context }: onDisconnectPayload) {
		this.logger.info('Connection closed', { docId: documentName, context });
	}

	async onUpgrade(data: onUpgradePayload) {
		this.logger.debug('Connection upgraded');
	}

	async onDestroy(data: onDestroyPayload) {
		this.logger.info('Server shutting down');
	}

	async onCreateDocument({ documentName, context }: onCreateDocumentPayload) {
		this.logger.debug('Document created', { docId: documentName, context });
	}

	async onLoadDocument({ documentName, context }: onLoadDocumentPayload) {
		this.logger.debug('Document loaded', { docId: documentName, context });
	}

	async onChange({ documentName, context }: onChangePayload) {
		this.logger.debug('Document changed', { docId: documentName, context });
	}

	async onStoreDocument({ documentName }: onStoreDocumentPayload) {
		this.logger.debug('Document stored', { docId: documentName });
	}

	async onAwarenessUpdate({
		documentName,
		context,
	}: onAwarenessUpdatePayload) {
		this.logger.debug('Awareness update', {
			docId: documentName,
			context,
		});
	}
}
