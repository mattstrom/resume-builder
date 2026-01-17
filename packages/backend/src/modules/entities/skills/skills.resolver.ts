import { Query, Resolver } from '@nestjs/graphql';
import { Skill } from '@resume-builder/entities';
import { SkillsService } from './skills.service';

@Resolver(() => Skill)
export class SkillsResolver {
	constructor(private readonly skillsService: SkillsService) {}

	@Query(() => [Skill])
	async listSkills(): Promise<Skill[]> {
		return this.skillsService.findAll();
	}
}
