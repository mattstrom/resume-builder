import {
	Args,
	Mutation,
	Parent,
	Query,
	ResolveField,
	Resolver,
} from '@nestjs/graphql';
import {
	Application,
	ApplicationInput,
	ApplicationUpdateInput,
	Resume,
} from '@resume-builder/entities';
import GraphQLJSON from 'graphql-type-json';
import { type UpdateOneModel } from 'mongoose';
import { CurrentUser } from '../../auth';
import { ResumesService } from '../resumes/resumes.service';
import { ApplicationsService } from './applications.service';

@Resolver(() => Application)
export class ApplicationsResolver {
	constructor(
		private readonly applicationsService: ApplicationsService,
		private readonly resumesService: ResumesService,
	) {}

	@Query(() => [Application])
	async listApplications(@CurrentUser('sub') uid: string) {
		return this.applicationsService.findAll(uid);
	}

	@Query(() => Application)
	async getApplication(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	) {
		return this.applicationsService.find(uid, id);
	}

	@Mutation(() => Application)
	async createApplication(
		@CurrentUser('sub') uid: string,
		@Args('applicationData') applicationData: ApplicationInput,
	) {
		return this.applicationsService.create(uid, applicationData);
	}

	@Mutation(() => Application)
	async updateApplication(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('applicationData') applicationData: ApplicationUpdateInput,
	) {
		return this.applicationsService.update(uid, id, applicationData);
	}

	@Mutation(() => Boolean)
	async deleteApplication(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	): Promise<boolean> {
		await this.applicationsService.delete(uid, id);
		return true;
	}

	@Mutation(() => Application)
	async patchApplication(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('update', { type: () => GraphQLJSON })
		update: UpdateOneModel<Application>,
	): Promise<void> {
		return this.applicationsService.patch(uid, id, update);
	}

	@ResolveField(() => [Resume], { nullable: true })
	async resumes(@Parent() application: Application): Promise<Resume[]> {
		return this.resumesService.findAll(application.uid, undefined, {
			applicationId: application._id,
		});
	}
}
