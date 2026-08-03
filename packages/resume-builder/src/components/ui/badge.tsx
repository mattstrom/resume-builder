import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
				outline: 'text-foreground',
				relationUses:
					'border-relation-uses/30 bg-relation-uses/10 text-relation-uses',
				relationDemonstrates:
					'border-relation-demonstrates/30 bg-relation-demonstrates/10 text-relation-demonstrates',
				relationSupports:
					'border-relation-supports/30 bg-relation-supports/10 text-relation-supports',
				relationProduced:
					'border-relation-produced/30 bg-relation-produced/10 text-relation-produced',
				relationType: 'border-relation-type/30 bg-relation-type/10 text-relation-type',
				relationRelatesTo:
					'border-relation-relates-to/30 bg-relation-relates-to/10 text-relation-relates-to',
				relationAbout:
					'border-relation-about/30 bg-relation-about/10 text-relation-about',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
