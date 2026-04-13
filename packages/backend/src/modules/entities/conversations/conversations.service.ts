import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	type ChatModelSelection,
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

	async findAllByApplicationId(
		uid: string,
		applicationId: string,
	): Promise<Conversation[]> {
		const results = await this.conversationModel
			.find({ applicationId, uid })
			.sort({ updatedAt: -1 })
			.exec();
		return results.map((item) => item.toObject());
	}

	async findById(uid: string, id: string): Promise<Conversation> {
		const result = await this.conversationModel
			.findOne({ _id: id, uid })
			.exec();
		if (!result) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
		return result.toObject();
	}

	async findOrCreate(
		uid: string,
		id?: string,
		data?: ConversationCreateInput,
	): Promise<Conversation> {
		const existing = await this.conversationModel
			.findOne({ _id: id, uid })
			.exec();

		if (existing) {
			return existing.toObject();
		}

		return this.create(uid, data!);
	}

	async create(
		uid: string,
		data: ConversationCreateInput,
	): Promise<Conversation> {
		const created = new this.conversationModel({ ...data, uid });
		const saved = await created.save();
		return saved.toObject();
	}

	async appendMessage(
		uid: string,
		id: string,
		message: { role: string; content: string },
	): Promise<void> {
		const result = await this.conversationModel
			.updateOne(
				{ _id: id, uid },
				{ $push: { messages: { ...message, createdAt: new Date() } } },
			)
			.exec();
		if (result.matchedCount === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}

	async setModel(
		uid: string,
		id: string,
		model: ChatModelSelection,
	): Promise<void> {
		const result = await this.conversationModel
			.updateOne({ _id: id, uid }, { $set: { model } })
			.exec();
		if (result.matchedCount === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.conversationModel
			.deleteOne({ _id: id, uid })
			.exec();
		if (result.deletedCount === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}
}
