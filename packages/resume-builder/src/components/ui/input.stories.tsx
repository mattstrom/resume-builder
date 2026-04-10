import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

const meta: Meta<typeof Input> = {
	title: 'UI/Input',
	component: Input,
	tags: ['autodocs'],
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'password', 'email', 'number', 'file'],
		},
		disabled: {
			control: 'boolean',
		},
	},
	args: {
		type: 'text',
		placeholder: 'Type something...',
		disabled: false,
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Default input',
	},
};

export const Password: Story = {
	args: {
		type: 'password',
		placeholder: 'Password',
	},
};

export const Email: Story = {
	args: {
		type: 'email',
		placeholder: 'Email',
	},
};

export const Number: Story = {
	args: {
		type: 'number',
		placeholder: 'Number',
	},
};

export const File: Story = {
	args: {
		type: 'file',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: 'Disabled input',
	},
};

export const WithLabel: Story = {
	render: (args) => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input {...args} id="email" />
		</div>
	),
	args: {
		type: 'email',
		placeholder: 'Email',
	},
};

export const WithButton: Story = {
	render: (args) => (
		<div className="flex w-full max-w-sm items-center space-x-2">
			<Input {...args} />
			<Button type="submit">Subscribe</Button>
		</div>
	),
	args: {
		type: 'email',
		placeholder: 'Email',
	},
};
