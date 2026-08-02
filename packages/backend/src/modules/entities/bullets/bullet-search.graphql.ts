import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Bullet } from '@resume-builder/entities';

@ObjectType()
export class BulletSearchResult {
	@Field(() => Bullet)
	bullet: Bullet;

	@Field(() => Float)
	score: number;
}
