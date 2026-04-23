import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	ContactInformation,
	ContactInformationInput,
} from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ContactInformationService {
	constructor(
		@InjectModel(ContactInformation.name)
		private readonly contactInformationModel: Model<ContactInformation>,
	) {}

	async findAll(uid: string) {
		return this.contactInformationModel.find({ uid }).exec();
	}

	async findOne(uid: string) {
		return this.contactInformationModel.findOne({ uid }).exec();
	}

	async upsert(uid: string, input: ContactInformationInput) {
		return this.contactInformationModel
			.findOneAndUpdate(
				{ uid },
				{ uid, ...input },
				{ upsert: true, new: true, setDefaultsOnInsert: true },
			)
			.exec();
	}
}
