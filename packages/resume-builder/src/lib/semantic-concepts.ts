import type { BadgeProps } from '@/components/ui/badge.tsx';

const RELATIONS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
	'is-a': { label: 'Type', variant: 'default' },
	'relates-to': { label: 'Related to', variant: 'outline' },
	about: { label: 'About', variant: 'secondary' },
	uses: { label: 'Uses', variant: 'relationUses' },
	demonstrates: { label: 'Demonstrates', variant: 'relationDemonstrates' },
	supports: { label: 'Supports', variant: 'relationSupports' },
	produced: { label: 'Produced', variant: 'relationProduced' },
};

export function conceptRelationPresentation(relation: string) {
	return RELATIONS[relation] ?? { label: relation, variant: 'outline' as const };
}
