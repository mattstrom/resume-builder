import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { z } from 'zod';

import {
	type ChatModelSelection,
	chatModelSelectionSchema,
} from '../chat-models';
import {
	ChatModelSelectionModel,
	ChatModelSelectionSchema,
} from './chat-model';

@ObjectType()
@Schema({ _id: false, versionKey: false, timestamps: false })
export class ConversationMessage {
	@Field()
	@Prop({ type: String, required: true })
	role: string;

	@Field()
	@Prop({ type: String, required: true })
	content: string;

	@Field()
	@Prop({ type: Date, default: () => new Date() })
	createdAt: Date;
}

export const ConversationMessageSchema =
	SchemaFactory.createForClass(ConversationMessage);

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ versionKey: false, timestamps: true })
@ObjectType({ description: 'Conversation' })
export class Conversation {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field()
	@Prop({ type: Types.ObjectId, required: true })
	applicationId: string;

	@Field()
	@Prop({ type: String, default: 'New Conversation' })
	title: string;

	@Field(() => [ConversationMessage])
	@Prop({ type: [ConversationMessageSchema], default: [] })
	messages: ConversationMessage[];

	@Field(() => ChatModelSelectionModel, { nullable: true })
	@Prop({ type: ChatModelSelectionSchema, required: false })
	model?: ChatModelSelection;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

@InputType()
export class ConversationCreateInput {
	@Field()
	applicationId: string;

	@Field({ nullable: true })
	title?: string;

	@Field(() => ChatModelSelectionModel, { nullable: true })
	model?: ChatModelSelection;
}

export const conversationMessageSchema = z.object({
	role: z.string(),
	content: z.string(),
	// createdAt: z.coerce.date(),
	createdAt: z.string(),
});

export const conversationSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	applicationId: z.string(),
	title: z.string(),
	messages: z.array(conversationMessageSchema),
	model: chatModelSelectionSchema.optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
