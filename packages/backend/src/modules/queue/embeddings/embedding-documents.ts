interface ConceptLink {
	relation: string;
	concept: { label: string };
}

function sortedUnique(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
		a.localeCompare(b),
	);
}

export function factEmbeddingText(fact: {
	what: string;
	impact?: string | null;
	scale?: string | null;
	concepts: ConceptLink[];
}): string {
	const parts = [fact.what.trim()];
	if (fact.impact?.trim()) parts.push(fact.impact.trim());
	if (fact.scale?.trim()) parts.push(fact.scale.trim());

	const meanings = sortedUnique(
		fact.concepts.map((link) => `${link.relation}: ${link.concept.label}`),
	);
	if (meanings.length) parts.push(meanings.join(', '));
	return parts.join('\n');
}

export function jobRequirementEmbeddingText(requirement: {
	what: string;
	tags: string[];
	technologies: string[];
}): string {
	const parts = [requirement.what.trim()];
	const tags = sortedUnique(requirement.tags);
	const technologies = sortedUnique(requirement.technologies);
	if (tags.length) parts.push(`tags: ${tags.join(', ')}`);
	if (technologies.length) parts.push(`technologies: ${technologies.join(', ')}`);
	return parts.join('\n');
}

const BULLET_RELATION_LABELS: Record<string, string> = {
	demonstrates: 'capabilities',
	uses: 'technologies',
	about: 'topics',
	supports: 'outcomes',
	produced: 'artifacts',
};

export function bulletEmbeddingText(bullet: { text: string; concepts: ConceptLink[] }): string {
	const parts = [bullet.text.trim()];
	for (const relation of Object.keys(BULLET_RELATION_LABELS)) {
		const labels = sortedUnique(
			bullet.concepts
				.filter((link) => link.relation === relation)
				.map((link) => link.concept.label),
		);
		if (labels.length) {
			parts.push(`${BULLET_RELATION_LABELS[relation]}: ${labels.join(', ')}`);
		}
	}
	return parts.join('\n');
}

export function conceptEmbeddingText(concept: {
	vocabulary: string;
	label: string;
	definition?: string | null;
	aliases: Array<{ label: string }>;
	outgoingRelations: Array<{
		relation: string;
		targetConcept: { label: string };
	}>;
	incomingRelations: Array<{
		relation: string;
		sourceConcept: { label: string };
	}>;
	ancestorLabels?: string[];
}): string {
	const parts = [`${concept.vocabulary}: ${concept.label.trim()}`];
	if (concept.definition?.trim()) {
		parts.push(`definition: ${concept.definition.trim()}`);
	}
	const aliases = sortedUnique(concept.aliases.map(({ label }) => label));
	if (aliases.length) parts.push(`also known as: ${aliases.join(', ')}`);

	const broader = sortedUnique([
		...(concept.ancestorLabels ?? []),
		...concept.outgoingRelations
			.filter(({ relation }) => relation === 'broader')
			.map(({ targetConcept }) => targetConcept.label),
	]);
	if (broader.length) parts.push(`broader concepts: ${broader.join(', ')}`);

	const related = sortedUnique([
		...concept.outgoingRelations
			.filter(({ relation }) => relation === 'related')
			.map(({ targetConcept }) => targetConcept.label),
		...concept.incomingRelations
			.filter(({ relation }) => relation === 'related')
			.map(({ sourceConcept }) => sourceConcept.label),
	]);
	if (related.length) parts.push(`related concepts: ${related.join(', ')}`);
	return parts.join('\n');
}
