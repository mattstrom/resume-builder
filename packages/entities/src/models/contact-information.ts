import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class ContactInformation {
	@Prop({ type: String, default: '' })
	location: string;

	@Prop({ type: String, default: '' })
	phoneNumber: string;

	@Prop({ type: String, default: '' })
	email: string;

	@Prop({ type: String, default: '' })
	linkedInProfile: string;

	@Prop({ type: String, default: '' })
	githubProfile: string;

	@Prop({ type: String, default: '' })
	personalWebsite: string;
}

export const ContactInformationSchema =
	SchemaFactory.createForClass(ContactInformation);

export const contactInformationSchema = z.object({
	_id: z.any(),
	location: z.string(),
	phoneNumber: z.string(),
	email: z.email(),
	linkedInProfile: z.string(),
	githubProfile: z.string(),
});
