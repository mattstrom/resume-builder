import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';
import { Label } from './label';
import { Button } from './button';

const meta: Meta<typeof Textarea> = {
	title: 'UI/Textarea',
	component: Textarea,
	tags: ['autodocs'],
	argTypes: {
		disabled: {
			control: 'boolean',
		},
	},
	args: {
		placeholder: 'Type your message here...',
		disabled: false,
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Default textarea',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: 'Disabled textarea',
	},
};

export const WithLabel: Story = {
	render: (args) => (
		<div className="grid w-full gap-1.5">
			<Label htmlFor="message">Your message</Label>
			<Textarea {...args} id="message" />
		</div>
	),
};

export const WithText: Story = {
	render: (args) => (
		<div className="grid w-full gap-1.5">
			<Label htmlFor="message-2">Your Message</Label>
			<Textarea {...args} id="message-2" />
			<p className="text-sm text-muted-foreground">
				Your message will be sent to the support team.
			</p>
		</div>
	),
};

export const WithButton: Story = {
	render: (args) => (
		<div className="grid w-full gap-2">
			<Textarea {...args} />
			<Button>Send message</Button>
		</div>
	),
};
