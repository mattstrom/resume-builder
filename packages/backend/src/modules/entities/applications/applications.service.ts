import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	Application,
	ApplicationInput,
	ApplicationUpdateInput,
} from '@resume-builder/entities';
import { Model, UpdateOneModel } from 'mongoose';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class ApplicationsService {
	constructor(
		private readonly resumeService: ResumesService,
		@InjectModel(Application.name)
		private readonly applicationModel: Model<Application>,
	) {}

	async findAll(uid: string): Promise<Application[]> {
		const results = await this.applicationModel
			.find({ uid })
			.sort({ updatedAt: -1 })
			.exec();
		return results.map((item) => item.toObject());
	}

	async find(uid: string, id: string): Promise<Application> {
		const result = await this.applicationModel
			.findOne({ _id: id, uid })
			.exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result.toObject();
	}

	async create(
		uid: string,
		applicationData: ApplicationInput,
		includeResume: boolean = true,
	): Promise<Application> {
		const created = new this.applicationModel({
			...applicationData,
			uid,
		});

		const saved = await created.save();

		if (includeResume) {
			await this.resumeService.createBlank(uid, {
				id: '',
				name: 'Untitled Resume',
				company: applicationData.company,
				jobPostingUrl: applicationData.jobPostingUrl,
				base: false,
				applicationId: saved._id.toString(),
			});
		}

		return saved.toObject();
	}

	async update(
		uid: string,
		id: string,
		updateData: ApplicationUpdateInput,
	): Promise<Application> {
		const updated = await this.applicationModel
			.findOneAndUpdate({ _id: id, uid }, updateData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Application with id ${id} not found`);
		}

		return updated.toObject();
	}

	async updateAssessment(
		uid: string,
		id: string,
		assessment: {
			jobSummary: Application['jobSummary'];
			analysis: Application['analysis'];
		},
	): Promise<Application> {
		const updated = await this.applicationModel
			.findOneAndUpdate(
				{ _id: id, uid },
				{
					jobSummary: assessment.jobSummary,
					analysis: assessment.analysis,
				},
				{ new: true },
			)
			.exec();

		if (!updated) {
			throw new NotFoundException(`Application with id ${id} not found`);
		}

		return updated.toObject();
	}

	async updateAnalysis(
		uid: string,
		id: string,
		analysis: Application['analysis'],
	): Promise<Application> {
		const updated = await this.applicationModel
			.findOneAndUpdate({ _id: id, uid }, { analysis }, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Application with id ${id} not found`);
		}

		return updated.toObject();
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.applicationModel
			.deleteOne({ _id: id, uid })
			.exec();

		if (result.deletedCount === 0) {
			throw new NotFoundException(`Application with id ${id} not found`);
		}
	}

	async patch(
		uid: string,
		id: string,
		update: UpdateOneModel<Application>,
	): Promise<void> {
		await this.applicationModel.updateOne({ _id: id, uid }, update).exec();
	}
}
