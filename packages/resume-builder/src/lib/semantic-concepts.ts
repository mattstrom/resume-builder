import type { BadgeProps } from '@/components/ui/badge.tsx';

const RELATIONS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
	'is-a': { label: 'Type', variant: 'relationType' },
	'relates-to': { label: 'Related to', variant: 'relationRelatesTo' },
	about: { label: 'About', variant: 'relationAbout' },
	uses: { label: 'Uses', variant: 'relationUses' },
	demonstrates: { label: 'Demonstrates', variant: 'relationDemonstrates' },
	supports: { label: 'Supports', variant: 'relationSupports' },
	produced: { label: 'Produced', variant: 'relationProduced' },
};

export function conceptRelationPresentation(relation: string) {
	return RELATIONS[relation] ?? { label: relation, variant: 'outline' as const };
}
