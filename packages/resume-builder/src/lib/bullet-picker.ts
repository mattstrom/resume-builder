import { type Bullet, BulletSourceType, BulletStatus } from '@resume-builder/entities';

export interface BulletPickerCandidate {
	bullet: Bullet;
	semanticScore?: number;
}

export function getBulletPickerCandidates(
	bullets: Bullet[],
	options: { search: string; sourceType: BulletSourceType; sourceId?: string },
): Bullet[] {
	const query = options.search.trim().toLocaleLowerCase();
	return bullets
		.filter(
			(bullet) =>
				bullet.status !== BulletStatus.ARCHIVED &&
				(!query ||
					[bullet.text, ...bullet.concepts.map(({ concept }) => concept.label)]
						.join(' ')
						.toLocaleLowerCase()
						.includes(query)),
		)
		.sort((left, right) => {
			const leftMatches =
				left.sourceType === options.sourceType && left.sourceId === options.sourceId;
			const rightMatches =
				right.sourceType === options.sourceType && right.sourceId === options.sourceId;
			return Number(rightMatches) - Number(leftMatches);
		});
}

export function mergeBulletPickerCandidates(
	semanticMatches: Array<{ bullet: Bullet; score: number }>,
	textMatches: Bullet[],
): BulletPickerCandidate[] {
	const semanticIds = new Set(semanticMatches.map(({ bullet }) => bullet.id));
	return [
		...semanticMatches.map(({ bullet, score }) => ({ bullet, semanticScore: score })),
		...textMatches
			.filter((bullet) => !semanticIds.has(bullet.id))
			.map((bullet) => ({ bullet })),
	];
}
