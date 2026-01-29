import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	CoverLetter,
	CoverLetterInput,
	CoverLetterUpdateInput,
} from '@resume-builder/entities';
import GraphQLJSON from 'graphql-type-json';
import { type UpdateOneModel } from 'mongoose';
import { CoverLettersService } from './cover-letters.service';

@Resolver(() => CoverLetter)
export class CoverLettersResolver {
	constructor(private readonly coverLettersService: CoverLettersService) {}

	@Query(() => [CoverLetter])
	async listCoverLetters() {
		return this.coverLettersService.findAll();
	}

	@Query(() => CoverLetter)
	async getCoverLetter(@Args('id') id: string) {
		return this.coverLettersService.find(id);
	}

	@Mutation(() => CoverLetter)
	async createCoverLetter(
		@Args('coverLetterData') coverLetterData: CoverLetterInput,
	) {
		return this.coverLettersService.create(coverLetterData);
	}

	@Mutation(() => CoverLetter)
	async updateCoverLetter(
		@Args('id') id: string,
		@Args('coverLetterData') coverLetterData: CoverLetterUpdateInput,
	) {
		return this.coverLettersService.update(id, coverLetterData);
	}

	@Mutation(() => CoverLetter)
	async patchCoverLetter(
		@Args('id') id: string,
		@Args('update', { type: () => GraphQLJSON })
		update: UpdateOneModel<CoverLetter>,
	): Promise<void> {
		return this.coverLettersService.patch(id, update);
	}
}
