import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	ButtonGroup,
	ButtonGroupText,
	ButtonGroupSeparator,
} from './button-group';
import { Button } from './button';
import { ChevronDown, Plus, Pencil, Trash } from 'lucide-react';

const meta: Meta<typeof ButtonGroup> = {
	title: 'UI/ButtonGroup',
	component: ButtonGroup,
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
	},
	args: {
		orientation: 'horizontal',
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button variant="outline">Left</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Right</Button>
		</ButtonGroup>
	),
};

export const Icons: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button variant="outline" size="icon">
				<Plus className="h-4 w-4" />
			</Button>
			<Button variant="outline" size="icon">
				<Pencil className="h-4 w-4" />
			</Button>
			<Button variant="outline" size="icon">
				<Trash className="h-4 w-4" />
			</Button>
		</ButtonGroup>
	),
};

export const Vertical: Story = {
	args: {
		orientation: 'vertical',
	},
	render: (args) => (
		<ButtonGroup {...args}>
			<Button variant="outline">Top</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Bottom</Button>
		</ButtonGroup>
	),
};

export const WithSeparator: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button variant="outline">Action</Button>
			<ButtonGroupSeparator />
			<Button variant="outline" size="icon">
				<ChevronDown className="h-4 w-4" />
			</Button>
		</ButtonGroup>
	),
};

export const Mixed: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<ButtonGroupText>Search</ButtonGroupText>
			<Button variant="outline">In Project</Button>
			<Button variant="outline">In Workspace</Button>
		</ButtonGroup>
	),
};
