import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

const meta: Meta<typeof Avatar> = {
	title: 'UI/Avatar',
	component: Avatar,
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Image: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
};

export const Fallback: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src="https://invalid-url.com" alt="@shadcn" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-4">
			<Avatar {...args} className="h-8 w-8">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback>SM</AvatarFallback>
			</Avatar>
			<Avatar {...args} className="h-10 w-10">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback>MD</AvatarFallback>
			</Avatar>
			<Avatar {...args} className="h-14 w-14">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
		</div>
	),
};
