import {
	Extension,
	onLoadDocumentPayload,
	onStoreDocumentPayload,
} from '@hocuspocus/server';
import { Resume } from '@resume-builder/entities';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class StorageService implements Extension {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
	) {}

	async onLoadDocument({}: onLoadDocumentPayload): Promise<void> {}

	async onStoreDocument(payload: onStoreDocumentPayload): Promise<void> {}
}
