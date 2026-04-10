import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
	title: 'UI/Separator',
	component: Separator,
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
		decorative: {
			control: 'boolean',
		},
	},
	args: {
		orientation: 'horizontal',
		decorative: true,
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	render: (args) => (
		<div>
			<div className="space-y-1">
				<h4 className="text-sm font-medium leading-none">
					Radix Primitives
				</h4>
				<p className="text-sm text-muted-foreground">
					An open-source UI component library.
				</p>
			</div>
			<Separator className="my-4" {...args} />
			<div className="flex h-5 items-center space-x-4 text-sm">
				<div>Blog</div>
				<Separator orientation="vertical" />
				<div>Docs</div>
				<Separator orientation="vertical" />
				<div>Source</div>
			</div>
		</div>
	),
};

export const Vertical: Story = {
	render: (args) => (
		<div className="flex h-5 items-center space-x-4 text-sm">
			<div>Blog</div>
			<Separator {...args} orientation="vertical" />
			<div>Docs</div>
			<Separator {...args} orientation="vertical" />
			<div>Source</div>
		</div>
	),
};
