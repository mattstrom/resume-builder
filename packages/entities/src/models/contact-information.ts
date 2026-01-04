import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';

@modelOptions({ schemaOptions: { versionKey: false } })
export class ContactInformation {
	@prop({ type: String })
	location: string = '';

	@prop({ type: String })
	phoneNumber: string = '';

	@prop({ type: String })
	email: string = '';

	@prop({ type: String })
	linkedInProfile: string = '';

	@prop({ type: String })
	githubProfile: string = '';
}

export const ContactInformationModel = getModelForClass(ContactInformation);

export const contactInformationSchema = z.object({
	_id: z.any(),
	location: z.string(),
	phoneNumber: z.string(),
	email: z.email(),
	linkedInProfile: z.string(),
	githubProfile: z.string(),
});
