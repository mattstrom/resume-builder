import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Application, Company, CompanyInput, CompanyUpdateInput } from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { CompaniesService } from './companies.service.js';

@Resolver(() => Company)
export class CompaniesResolver {
	constructor(private readonly companiesService: CompaniesService) {}

	@Query(() => [Company])
	async listCompanies(@CurrentUser('sub') uid: string): Promise<Company[]> {
		return this.companiesService.findAll(uid);
	}

	@Query(() => Company)
	async getCompany(@CurrentUser('sub') uid: string, @Args('id') id: string): Promise<Company> {
		return this.companiesService.find(uid, id);
	}

	@Mutation(() => Company)
	async createCompany(
		@CurrentUser('sub') uid: string,
		@Args('company') company: CompanyInput,
	): Promise<Company> {
		return this.companiesService.create(uid, company);
	}

	@Mutation(() => Company)
	async updateCompany(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('company') company: CompanyUpdateInput,
	): Promise<Company> {
		return this.companiesService.update(uid, id, company);
	}

	@Mutation(() => Boolean)
	async deleteCompany(@CurrentUser('sub') uid: string, @Args('id') id: string): Promise<boolean> {
		await this.companiesService.delete(uid, id);
		return true;
	}

	@ResolveField(() => [Application], { nullable: true })
	async applications(@Parent() company: Company): Promise<Application[]> {
		return this.companiesService.findApplications(company.createdBy, company.id);
	}
}
