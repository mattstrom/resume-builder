import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ContactInformation } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ContactInformationService {
	constructor(
		@InjectModel(ContactInformation.name)
		private readonly contactInformationModel: Model<ContactInformation>,
	) {}

	async findAll() {
		return this.contactInformationModel.find().exec();
	}
}
