import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch';
import { Label } from './label';

const meta: Meta<typeof Switch> = {
	title: 'UI/Switch',
	component: Switch,
	tags: ['autodocs'],
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		checked: {
			control: 'boolean',
		},
	},
	args: {
		disabled: false,
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const WithLabel: Story = {
	render: (args) => (
		<div className="flex items-center space-x-2">
			<Switch {...args} id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
};
