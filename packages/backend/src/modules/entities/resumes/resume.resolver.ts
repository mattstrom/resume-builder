import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortInput,
	ResumeUpdateInput,
} from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { CrdtApiService } from '../../crdt-client/crdt-api.service.js';
import { ResumeSearchResult } from './resume-search.graphql.js';
import { ResumesService } from './resumes.service.js';

@Resolver(() => Resume)
export class ResumeResolver {
	constructor(
		private readonly resumesService: ResumesService,
		private readonly crdtApi: CrdtApiService,
	) {}

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

	@Query(() => [ResumeSearchResult])
	async searchResumes(
		@CurrentUser('sub') uid: string,
		@Args('query') query: string,
		@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
		limit: number,
		@Args('semanticOnly', { nullable: true, defaultValue: false })
		semanticOnly: boolean,
	): Promise<ResumeSearchResult[]> {
		return this.resumesService.search(uid, query, limit, semanticOnly);
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

	@Mutation(() => Boolean)
	async deleteResume(@CurrentUser('sub') uid: string, @Args('id') id: string): Promise<boolean> {
		await this.resumesService.delete(uid, id);
		return true;
	}

	@Mutation(() => Resume)
	async applyResumeXml(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('xml') xml: string,
		@Args('baseStateVector', { nullable: true }) baseStateVector?: string,
	) {
		const metadata = await this.resumesService.find(uid, id);
		const result = await this.crdtApi.replaceResumeXml(
			`resume:${id}`,
			uid,
			xml,
			baseStateVector,
		);
		return {
			...metadata,
			xml: result.xml,
			data: result.resume,
		};
	}
}
