import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	Conversation,
	ConversationCreateInput,
} from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ConversationsService {
	constructor(
		@InjectModel(Conversation.name)
		private readonly conversationModel: Model<Conversation>,
	) {}

	async findAllByResumeId(resumeId: string): Promise<Conversation[]> {
		const results = await this.conversationModel
			.find({ resumeId })
			.sort({ updatedAt: -1 })
			.exec();
		return results.map((item) => item.toObject());
	}

	async findById(id: string): Promise<Conversation> {
		const result = await this.conversationModel.findById(id).exec();
		if (!result) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
		return result.toObject();
	}

	async create(data: ConversationCreateInput): Promise<Conversation> {
		const created = new this.conversationModel(data);
		const saved = await created.save();
		return saved.toObject();
	}

	async appendMessage(
		id: string,
		message: { role: string; content: string },
	): Promise<void> {
		const result = await this.conversationModel
			.updateOne(
				{ _id: id },
				{ $push: { messages: { ...message, createdAt: new Date() } } },
			)
			.exec();
		if (result.matchedCount === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}

	async delete(id: string): Promise<void> {
		const result = await this.conversationModel
			.deleteOne({ _id: id })
			.exec();
		if (result.deletedCount === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}
}
