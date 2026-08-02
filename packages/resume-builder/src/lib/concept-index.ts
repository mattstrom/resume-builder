import type { BulletConcept } from '@resume-builder/entities';

export interface ConceptIndexBullet {
	id: string;
	text: string;
	sourceType: string;
	sourceId: string;
	status: string;
	concepts: BulletConcept[];
}

export interface ConceptUsage {
	concept: BulletConcept['concept'];
	bullets: Array<{
		bullet: ConceptIndexBullet;
		link: BulletConcept;
	}>;
}

export function buildConceptIndex(bullets: ConceptIndexBullet[]): ConceptUsage[] {
	const usages = new Map<string, ConceptUsage>();

	for (const bullet of bullets) {
		for (const link of bullet.concepts) {
			const usage = usages.get(link.conceptId) ?? {
				concept: link.concept,
				bullets: [],
			};
			usage.bullets.push({ bullet, link });
			usages.set(link.conceptId, usage);
		}
	}

	return [...usages.values()].sort((left, right) =>
		left.concept.label.localeCompare(right.concept.label),
	);
}

export function filterConceptIndex(usages: ConceptUsage[], search: string): ConceptUsage[] {
	const query = search.trim().toLocaleLowerCase();
	if (!query) return usages;

	const conceptMatches = usages.filter((usage) =>
		[usage.concept.label, usage.concept.key, usage.concept.vocabulary, usage.concept.definition]
			.filter(Boolean)
			.join(' ')
			.toLocaleLowerCase()
			.includes(query),
	);
	if (conceptMatches.length > 0) return conceptMatches;

	return usages.flatMap((usage) => {
		const matchingBullets = usage.bullets.filter(({ bullet, link }) =>
			[bullet.text, bullet.sourceType, bullet.status, link.relation]
				.join(' ')
				.toLocaleLowerCase()
				.includes(query),
		);

		return matchingBullets.length > 0 ? [{ ...usage, bullets: matchingBullets }] : [];
	});
}
