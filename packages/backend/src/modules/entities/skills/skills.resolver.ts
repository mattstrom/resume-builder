import { Query, Resolver } from '@nestjs/graphql';
import { Skill } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { SkillsService } from './skills.service';

@Resolver(() => Skill)
export class SkillsResolver {
	constructor(private readonly skillsService: SkillsService) {}

	@Query(() => [Skill])
	async listSkills(@CurrentUser('sub') uid: string): Promise<Skill[]> {
		return this.skillsService.findAll(uid);
	}
}
