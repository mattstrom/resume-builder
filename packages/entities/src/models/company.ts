import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { z } from 'zod';

export const UNSPECIFIED_COMPANY_NAME = 'Unspecified';

export enum CompanyType {
	employer = 'employer',
	recruiter = 'recruiter',
	other = 'other',
}

export enum LocationType {
	on_site = 'on_site',
	hybrid = 'hybrid',
	remote = 'remote',
}

registerEnumType(CompanyType, { name: 'CompanyType' });
registerEnumType(LocationType, { name: 'LocationType' });

@ObjectType()
@InputType('CompanyAddressInput')
export class CompanyAddress {
	@Field({ nullable: true })
	streetAddress?: string;

	@Field({ nullable: true })
	city?: string;

	@Field({ nullable: true })
	state?: string;

	@Field({ nullable: true })
	zip?: string;
}

@ObjectType({ description: 'Company' })
export class Company {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field(() => CompanyType)
	type: CompanyType;

	@Field()
	website: string;

	@Field(() => LocationType)
	locationType: LocationType;

	@Field(() => CompanyAddress)
	address: CompanyAddress;

	@Field()
	createdAt: Date;

	@Field()
	createdBy: string;

	@Field()
	updatedAt: Date;

	@Field()
	updatedBy: string;
}

@InputType()
export class CompanyInput {
	@Field()
	name: string;

	@Field(() => CompanyType, { defaultValue: CompanyType.employer })
	type: CompanyType;

	@Field({ defaultValue: '' })
	website: string;

	@Field(() => LocationType, { defaultValue: LocationType.remote })
	locationType: LocationType;

	@Field(() => CompanyAddress, { nullable: true })
	address?: CompanyAddress;
}

@InputType()
export class CompanyUpdateInput {
	@Field({ nullable: true })
	name?: string;

	@Field(() => CompanyType, { nullable: true })
	type?: CompanyType;

	@Field({ nullable: true })
	website?: string;

	@Field(() => LocationType, { nullable: true })
	locationType?: LocationType;

	@Field(() => CompanyAddress, { nullable: true })
	address?: CompanyAddress;
}

export interface CompanyGroup {
	id: string;
	name: string;
	applicationIds: string[];
	resumeIds: string[];
	applicationCount: number;
	resumeCount: number;
	updatedAt: Date | string | null;
}

export function normalizeCompanyName(company?: string | null): string {
	return company?.trim() || UNSPECIFIED_COMPANY_NAME;
}

export const companyAddressSchema = z.object({
	streetAddress: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zip: z.string().optional(),
});

export const companySchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(CompanyType),
	website: z.string(),
	locationType: z.enum(LocationType),
	address: companyAddressSchema,
	createdAt: z.iso.datetime(),
	createdBy: z.string(),
	updatedAt: z.iso.datetime(),
	updatedBy: z.string(),
});

export const companyInputSchema = companySchema.pick({
	name: true,
	type: true,
	website: true,
	locationType: true,
	address: true,
});
