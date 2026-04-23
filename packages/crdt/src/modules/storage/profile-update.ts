import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
	versionKey: false,
	timestamps: true,
	collection: 'profile_updates',
})
export class ProfileUpdate {
	_id: string;

	@Prop({ type: String, required: true, index: true })
	name: string;

	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Prop({ type: Number, required: true })
	sequence: number;

	@Prop({ type: Buffer, required: true })
	update: Buffer;

	createdAt: Date;
	updatedAt: Date;
}

export const ProfileUpdateSchema = SchemaFactory.createForClass(ProfileUpdate);

ProfileUpdateSchema.index({ name: 1, uid: 1, sequence: -1 });
