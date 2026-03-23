import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Volunteering, VolunteeringInput } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class VolunteeringService {
	constructor(
		@InjectModel(Volunteering.name)
		private readonly volunteeringModel: Model<Volunteering>,
	) {}

	async findAll(uid: string) {
		return this.volunteeringModel.find({ uid }).exec();
	}

	async create(
		uid: string,
		volunteering: VolunteeringInput,
	): Promise<Volunteering> {
		const created = new this.volunteeringModel({ ...volunteering, uid });
		const saved = await created.save();
		return saved.toObject();
	}
}
