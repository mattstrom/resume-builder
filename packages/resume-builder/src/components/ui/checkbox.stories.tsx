import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
	title: 'UI/Checkbox',
	component: Checkbox,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
	render: (args) => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" {...args} />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
	render: (args) => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms2" {...args} />
			<Label
				htmlFor="terms2"
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Accept terms and conditions
			</Label>
		</div>
	),
};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
	render: (args) => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms3" {...args} />
			<Label htmlFor="terms3">Accept terms and conditions</Label>
		</div>
	),
};
