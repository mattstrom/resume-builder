import type { Meta, StoryObj } from '@storybook/react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './tooltip';
import { Button } from './button';

const meta: Meta<typeof Tooltip> = {
	title: 'UI/Tooltip',
	component: Tooltip,
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<TooltipProvider>
				<Story />
			</TooltipProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
	render: (args) => (
		<div className="flex justify-center p-12">
			<Tooltip {...args}>
				<TooltipTrigger asChild>
					<Button variant="outline">Hover me</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Add to library</p>
				</TooltipContent>
			</Tooltip>
		</div>
	),
};

export const CustomSide: Story = {
	render: (args) => (
		<div className="flex justify-center p-12">
			<Tooltip {...args}>
				<TooltipTrigger asChild>
					<Button variant="outline">Right Tooltip</Button>
				</TooltipTrigger>
				<TooltipContent side="right">
					<p>Tooltip on the right</p>
				</TooltipContent>
			</Tooltip>
		</div>
	),
};
