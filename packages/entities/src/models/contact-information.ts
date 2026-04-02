import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Contact Information' })
export class ContactInformation {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field()
	@Prop({ type: String, default: '' })
	location: string;

	@Field()
	@Prop({ type: String, default: '' })
	phoneNumber: string;

	@Field()
	@Prop({ type: String, default: '' })
	email: string;

	@Field()
	@Prop({ type: String, default: '' })
	linkedInProfile: string;

	@Field()
	@Prop({ type: String, default: '' })
	githubProfile: string;

	@Field()
	@Prop({ type: String, default: '' })
	personalWebsite: string;
}

@InputType()
export class ContactInformationInput extends OmitType(
	ContactInformation,
	['_id', 'uid'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const ContactInformationSchema =
	SchemaFactory.createForClass(ContactInformation);

export const contactInformationSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	location: z.string(),
	phoneNumber: z.string(),
	email: z.email(),
	linkedInProfile: z.string(),
	githubProfile: z.string(),
	personalWebsite: z.string(),
});
