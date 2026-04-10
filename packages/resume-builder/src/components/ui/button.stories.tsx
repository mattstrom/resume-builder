import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta: Meta<typeof Button> = {
	title: 'UI/Button',
	component: Button,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: [
				'default',
				'destructive',
				'outline',
				'secondary',
				'ghost',
				'link',
			],
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
		},
		asChild: {
			control: 'boolean',
		},
	},
	args: {
		children: 'Button',
		variant: 'default',
		size: 'default',
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'default',
		children: 'Button',
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

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary',
	},
};

export const Ghost: Story = {
	args: {
		variant: 'ghost',
		children: 'Ghost',
	},
};

export const Link: Story = {
	args: {
		variant: 'link',
		children: 'Link',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
		children: 'Small Button',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
		children: 'Large Button',
	},
};

export const Icon: Story = {
	args: {
		size: 'icon',
		children: '🔍',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: 'Disabled Button',
	},
};

export const AsChild: Story = {
	args: {
		asChild: true,
		children: <a href="https://example.com">Link as Button</a>,
	},
};
