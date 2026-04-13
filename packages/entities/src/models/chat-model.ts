import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@ObjectType()
@InputType('ChatModelSelectionInput')
@Schema({ _id: false, versionKey: false, timestamps: false })
export class ChatModelSelectionModel {
	@Field()
	@Prop({ type: String, required: true })
	provider: string;

	@Field()
	@Prop({ type: String, required: true })
	model: string;
}

export const ChatModelSelectionSchema = SchemaFactory.createForClass(
	ChatModelSelectionModel,
);
