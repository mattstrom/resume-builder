import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false, timestamps: true, collection: 'documents' })
@ObjectType()
export class Document {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, unique: true, index: true })
	name: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Prop({ type: Buffer })
	update: Buffer;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
