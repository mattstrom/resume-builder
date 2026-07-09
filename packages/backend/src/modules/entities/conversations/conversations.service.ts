import { Injectable, NotFoundException } from '@nestjs/common';
import { Conversation, ConversationCreateInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

const MESSAGES_INCLUDE = { messages: { orderBy: { createdAt: 'asc' as const } } };

type ConversationWithMessages = Conversation & { _id: string };

@Injectable()
export class ConversationsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAllByApplicationId(
		uid: string,
		applicationId: string,
	): Promise<ConversationWithMessages[]> {
		const results = await this.prisma.conversation.findMany({
			where: { applicationId, uid },
			orderBy: { updatedAt: 'desc' },
			include: MESSAGES_INCLUDE,
		});
		return results.map((r) => ({ ...r, _id: r.id }) as ConversationWithMessages);
	}

	async findById(uid: string, id: string): Promise<ConversationWithMessages> {
		const result = await this.prisma.conversation.findFirst({
			where: { id, uid },
			include: MESSAGES_INCLUDE,
		});
		if (!result) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
		return { ...result, _id: result.id } as ConversationWithMessages;
	}

	async findOrCreate(
		uid: string,
		id?: string,
		data?: ConversationCreateInput,
	): Promise<ConversationWithMessages> {
		if (id) {
			const existing = await this.prisma.conversation.findFirst({
				where: { id, uid },
				include: MESSAGES_INCLUDE,
			});
			if (existing) {
				return { ...existing, _id: existing.id } as ConversationWithMessages;
			}
		}
		return this.create(uid, data!);
	}

	async create(uid: string, data: ConversationCreateInput): Promise<ConversationWithMessages> {
		const result = await this.prisma.conversation.create({
			data: { ...data, uid },
			include: MESSAGES_INCLUDE,
		});
		return { ...result, _id: result.id } as ConversationWithMessages;
	}

	async appendMessage(
		uid: string,
		id: string,
		message: { role: string; content: string },
	): Promise<void> {
		const conversation = await this.prisma.conversation.findFirst({ where: { id, uid } });
		if (!conversation) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
		await this.prisma.conversationMessage.create({
			data: { conversationId: id, role: message.role, content: message.content },
		});
		await this.prisma.conversation.update({
			where: { id },
			data: { updatedAt: new Date() },
		});
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.prisma.conversation.deleteMany({ where: { id, uid } });
		if (result.count === 0) {
			throw new NotFoundException(`Conversation with id ${id} not found`);
		}
	}
}
