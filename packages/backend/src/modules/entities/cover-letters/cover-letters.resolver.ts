import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	CoverLetter,
	CoverLetterInput,
	CoverLetterUpdateInput,
} from '@resume-builder/entities';
import GraphQLJSON from 'graphql-type-json';
import { type UpdateOneModel } from 'mongoose';
import { CurrentUser } from '../../auth';
import { CoverLettersService } from './cover-letters.service';

@Resolver(() => CoverLetter)
export class CoverLettersResolver {
	constructor(private readonly coverLettersService: CoverLettersService) {}

	@Query(() => [CoverLetter])
	async listCoverLetters(@CurrentUser('sub') uid: string) {
		return this.coverLettersService.findAll(uid);
	}

	@Query(() => CoverLetter)
	async getCoverLetter(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	) {
		return this.coverLettersService.find(uid, id);
	}

	@Mutation(() => CoverLetter)
	async createCoverLetter(
		@CurrentUser('sub') uid: string,
		@Args('coverLetterData') coverLetterData: CoverLetterInput,
	) {
		return this.coverLettersService.create(uid, coverLetterData);
	}

	@Mutation(() => CoverLetter)
	async updateCoverLetter(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('coverLetterData') coverLetterData: CoverLetterUpdateInput,
	) {
		return this.coverLettersService.update(uid, id, coverLetterData);
	}

	@Mutation(() => CoverLetter)
	async patchCoverLetter(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('update', { type: () => GraphQLJSON })
		update: UpdateOneModel<CoverLetter>,
	): Promise<void> {
		return this.coverLettersService.patch(uid, id, update);
	}
}
