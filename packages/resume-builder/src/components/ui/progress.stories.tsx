import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './progress';
import { useEffect, useState } from 'react';

const meta = {
	title: 'UI/Progress',
	component: Progress,
	tags: ['autodocs'],
	argTypes: {
		value: {
			control: { type: 'range', min: 0, max: 100, step: 1 },
		},
	},
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: 40,
	},
};

export const Complete: Story = {
	args: {
		value: 100,
	},
};

export const Low: Story = {
	args: {
		value: 5,
	},
};

export const Animated: Story = {
	render: (args) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [progress, setProgress] = useState(0);

		// eslint-disable-next-line react-hooks/rules-of-hooks
		useEffect(() => {
			const timer = setTimeout(() => setProgress(args.value || 0), 500);
			return () => clearTimeout(timer);
		}, [args.value]);

		return <Progress {...args} value={progress} />;
	},
	args: {
		value: 66,
	},
};
