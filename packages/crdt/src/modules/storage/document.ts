import { Prop, SchemaFactory } from '@nestjs/mongoose';

export class Document {
	@Prop({ type: Buffer })
	update: Buffer;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
