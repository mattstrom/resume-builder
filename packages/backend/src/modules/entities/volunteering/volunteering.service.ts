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

	async findAll() {
		return this.volunteeringModel.find().exec();
	}

	async create(volunteering: VolunteeringInput): Promise<Volunteering> {
		const created = new this.volunteeringModel(volunteering);
		const saved = await created.save();
		return saved.toObject();
	}
}
