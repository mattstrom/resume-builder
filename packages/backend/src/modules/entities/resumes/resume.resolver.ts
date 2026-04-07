import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeAddCollectionItemInput,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeRemoveCollectionItemInput,
	ResumeSetFieldInput,
	ResumeSortInput,
	ResumeUpdateInput,
} from '@resume-builder/entities';
import GraphQLJSON from 'graphql-type-json';
import { type UpdateOneModel } from 'mongoose';
import { CurrentUser } from '../../auth';
import { ResumesService } from './resumes.service';

@Resolver(() => Resume)
export class ResumeResolver {
	constructor(private readonly resumesService: ResumesService) {}

	@Query(() => [Resume])
	async listResumes(
		@CurrentUser('sub') uid: string,
		@Args('sort', { type: () => ResumeSortInput, nullable: true })
		sort?: ResumeSortInput,
		@Args('filter', { type: () => ResumeFilterInput, nullable: true })
		filter?: ResumeFilterInput,
	) {
		return this.resumesService.findAll(uid, sort, filter);
	}

	@Query(() => Resume)
	async getResume(@CurrentUser('sub') uid: string, @Args('id') id: string) {
		return this.resumesService.find(uid, id);
	}

	@Mutation(() => Resume)
	async createResume(
		@CurrentUser('sub') uid: string,
		@Args('resumeData') resumeData: ResumeCreateInput,
	) {
		return this.resumesService.create(uid, resumeData);
	}

	@Mutation(() => Resume)
	async createBlankResume(
		@CurrentUser('sub') uid: string,
		@Args('resumeData') resumeData: BlankResumeCreateInput,
	) {
		return this.resumesService.createBlank(uid, resumeData);
	}

	@Mutation(() => Resume)
	async updateResume(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('resumeData') resumeData: ResumeUpdateInput,
	) {
		return this.resumesService.update(uid, id, resumeData);
	}

	@Mutation(() => Resume)
	async patchResume(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('update', { type: () => GraphQLJSON })
		update: UpdateOneModel<Resume>,
	): Promise<Resume> {
		return this.resumesService.patch(uid, id, update);
	}

	@Mutation(() => Resume)
	async setResumeField(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('input') input: ResumeSetFieldInput,
		@Args('value', { type: () => GraphQLJSON }) value: unknown,
	) {
		return this.resumesService.setField(uid, id, input.path, value);
	}

	@Mutation(() => Resume)
	async addResumeCollectionItem(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('input') input: ResumeAddCollectionItemInput,
	) {
		return this.resumesService.addCollectionItem(uid, id, input.collection);
	}

	@Mutation(() => Resume)
	async removeResumeCollectionItem(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('input') input: ResumeRemoveCollectionItemInput,
	) {
		return this.resumesService.removeCollectionItem(
			uid,
			id,
			input.collection,
			input.index,
		);
	}
}
