import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Education, EducationInput } from '@resume-builder/entities';
import { EducationsService } from './educations.service';

@Resolver(() => Education)
export class EducationsResolver {
	constructor(private readonly educationsService: EducationsService) {}

	@Query(() => [Education])
	async listEducations(): Promise<Education[]> {
		return this.educationsService.findAll();
	}

	@Query(() => Education)
	async findEducation(@Args('id') id: string): Promise<Education | null> {
		return this.educationsService.find(id);
	}

	@Mutation(() => Education)
	async createEducation(@Args('education') education: EducationInput) {
		return this.educationsService.create(education);
	}

	@Mutation(() => Education)
	async updateEducation(
		@Args('id') id: string,
		@Args('education') education: EducationInput,
	) {
		return this.educationsService.update(id, education);
	}

	@Mutation(() => Boolean)
	async deleteEducation(@Args('id') id: string): Promise<boolean> {
		await this.educationsService.delete(id);
		return true;
	}
}
