import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
	title: 'UI/Badge',
	component: Badge,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'secondary', 'destructive', 'outline'],
		},
	},
	args: {
		children: 'Badge',
		variant: 'default',
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'default',
		children: 'Default',
	},
};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary',
	},
};

export const Destructive: Story = {
	args: {
		variant: 'destructive',
		children: 'Destructive',
	},
};

export const Outline: Story = {
	args: {
		variant: 'outline',
		children: 'Outline',
	},
};

export const Interactive: Story = {
	args: {
		children: 'Interactive Badge',
		className: 'hover:bg-primary/80 cursor-pointer',
	},
};
