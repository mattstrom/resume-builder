import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './label';
import { Input } from './input';

const meta: Meta<typeof Label> = {
	title: 'UI/Label',
	component: Label,
	tags: ['autodocs'],
	argTypes: {
		children: {
			control: 'text',
		},
	},
	args: {
		children: 'Label',
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Label',
	},
};

export const WithInput: Story = {
	render: (args) => (
		<div className="flex flex-col space-y-2">
			<Label {...args} htmlFor="username">
				Username
			</Label>
			<Input id="username" placeholder="Enter your username" />
		</div>
	),
};
