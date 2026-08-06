import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils.ts';

import { Label } from './label.tsx';

function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="field-group"
			className={cn('flex w-full flex-col gap-6', className)}
			{...props}
		/>
	);
}

const fieldVariants = cva('flex w-full gap-3', {
	variants: {
		orientation: {
			vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
			horizontal: 'flex-row items-center',
		},
	},
	defaultVariants: {
		orientation: 'vertical',
	},
});

function Field({
	className,
	orientation = 'vertical',
	...props
}: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
	return (
		<div
			role="group"
			data-slot="field"
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	);
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
	return (
		<Label
			data-slot="field-label"
			className={cn('flex w-fit gap-2 leading-snug', className)}
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
	return (
		<p
			data-slot="field-description"
			className={cn(
				'text-sm font-normal leading-normal text-muted-foreground',
				className,
			)}
			{...props}
		/>
	);
}

export { Field, FieldDescription, FieldGroup, FieldLabel };
