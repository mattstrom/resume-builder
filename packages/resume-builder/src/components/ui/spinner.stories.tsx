import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './spinner';
import { Button } from './button';

const meta: Meta<typeof Spinner> = {
	title: 'UI/Spinner',
	component: Spinner,
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Large: Story = {
	args: {
		className: 'size-8',
	},
};

export const Colored: Story = {
	args: {
		className: 'text-primary',
	},
};

export const InButton: Story = {
	render: (args) => (
		<Button disabled>
			<Spinner {...args} className="mr-2 animate-spin" />
			Please wait
		</Button>
	),
};
