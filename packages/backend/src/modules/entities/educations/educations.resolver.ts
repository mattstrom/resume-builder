import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Education, EducationInput } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { EducationsService } from './educations.service';

@Resolver(() => Education)
export class EducationsResolver {
	constructor(private readonly educationsService: EducationsService) {}

	@Query(() => [Education])
	async listEducations(
		@CurrentUser('sub') uid: string,
	): Promise<Education[]> {
		return this.educationsService.findAll(uid);
	}

	@Query(() => Education)
	async findEducation(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	): Promise<Education | null> {
		return this.educationsService.find(uid, id);
	}

	@Mutation(() => Education)
	async createEducation(
		@CurrentUser('sub') uid: string,
		@Args('education') education: EducationInput,
	) {
		return this.educationsService.create(uid, education);
	}

	@Mutation(() => Education)
	async updateEducation(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('education') education: EducationInput,
	) {
		return this.educationsService.update(uid, id, education);
	}

	@Mutation(() => Boolean)
	async deleteEducation(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	): Promise<boolean> {
		await this.educationsService.delete(uid, id);
		return true;
	}
}
