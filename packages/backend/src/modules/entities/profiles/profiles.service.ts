import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	NarrativeSummaryData,
	Profile,
	ProfileUpdateInput,
} from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ProfilesService {
	constructor(
		@InjectModel(Profile.name)
		private readonly profileModel: Model<Profile>,
	) {}

	async findOne(uid: string): Promise<Profile | null> {
		return this.profileModel.findOne({ uid }).exec();
	}

	async upsert(uid: string, input: ProfileUpdateInput): Promise<Profile> {
		const result = await this.profileModel
			.findOneAndUpdate(
				{ uid },
				{ $set: input, $setOnInsert: { uid } },
				{ upsert: true, new: true },
			)
			.exec();

		return result as Profile;
	}

	async updateNarrativeSummary(
		uid: string,
		narrativeSummary: NarrativeSummaryData,
	): Promise<Profile> {
		const result = await this.profileModel
			.findOneAndUpdate(
				{ uid },
				{ $set: { narrativeSummary }, $setOnInsert: { uid } },
				{ upsert: true, new: true },
			)
			.exec();

		return result as Profile;
	}
}
