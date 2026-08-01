import { Field, Float, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { z } from 'zod';

export enum BulletSourceType {
	JOB = 'job',
	PROJECT = 'project',
	VOLUNTEERING = 'volunteering',
}

export enum BulletStatus {
	DRAFT = 'draft',
	READY = 'ready',
	ARCHIVED = 'archived',
}

registerEnumType(BulletSourceType, { name: 'BulletSourceType' });
registerEnumType(BulletStatus, { name: 'BulletStatus' });

@ObjectType()
export class Bullet {
	@Field(() => ID)
	id: string;

	@Field()
	uid: string;

	@Field()
	text: string;

	@Field(() => BulletSourceType)
	sourceType: BulletSourceType;

	@Field(() => ID)
	sourceId: string;

	@Field(() => BulletStatus)
	status: BulletStatus;

	@Field(() => Float, { nullable: true })
	contextScore?: number;

	@Field({ nullable: true })
	contextNote?: string;

	@Field(() => Float, { nullable: true })
	actionScore?: number;

	@Field({ nullable: true })
	actionNote?: string;

	@Field(() => Float, { nullable: true })
	outcomeScore?: number;

	@Field({ nullable: true })
	outcomeNote?: string;

	@Field(() => Float, { nullable: true })
	clarityScore?: number;

	@Field({ nullable: true })
	clarityNote?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateBulletInput {
	@Field()
	text: string;

	@Field(() => BulletSourceType)
	sourceType: BulletSourceType;

	@Field(() => ID)
	sourceId: string;
}

@InputType()
export class UpdateBulletInput {
	@Field({ nullable: true })
	text?: string;

	@Field(() => Float, { nullable: true })
	contextScore?: number;

	@Field({ nullable: true })
	contextNote?: string;

	@Field(() => Float, { nullable: true })
	actionScore?: number;

	@Field({ nullable: true })
	actionNote?: string;

	@Field(() => Float, { nullable: true })
	outcomeScore?: number;

	@Field({ nullable: true })
	outcomeNote?: string;

	@Field(() => Float, { nullable: true })
	clarityScore?: number;

	@Field({ nullable: true })
	clarityNote?: string;
}

@InputType()
export class BulletFilterInput {
	@Field(() => BulletSourceType, { nullable: true })
	sourceType?: BulletSourceType;

	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => BulletStatus, { nullable: true })
	status?: BulletStatus;

	@Field({ nullable: true })
	search?: string;

	@Field({ nullable: true, defaultValue: false })
	includeArchived?: boolean;
}

const scoreSchema = z.number().min(0).max(1).nullable().optional();

export const createBulletSchema = z.object({
	text: z.string().trim().min(1),
	sourceType: z.enum(BulletSourceType),
	sourceId: z.string().min(1),
});

export const updateBulletSchema = z.object({
	text: z.string().trim().min(1).optional(),
	contextScore: scoreSchema,
	contextNote: z.string().nullable().optional(),
	actionScore: scoreSchema,
	actionNote: z.string().nullable().optional(),
	outcomeScore: scoreSchema,
	outcomeNote: z.string().nullable().optional(),
	clarityScore: scoreSchema,
	clarityNote: z.string().nullable().optional(),
});
