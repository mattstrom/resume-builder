import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupInput,
	InputGroupTextarea,
} from './input-group';
import { Mail, Search, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const meta = {
	title: 'UI/InputGroup',
	component: InputGroup,
	tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<InputGroup>
			<InputGroupAddon>
				<Mail className="h-4 w-4" />
			</InputGroupAddon>
			<InputGroupInput placeholder="Email address" />
		</InputGroup>
	),
};

export const WithButton: Story = {
	render: () => (
		<InputGroup>
			<InputGroupInput placeholder="Search..." />
			<InputGroupAddon align="inline-end">
				<InputGroupButton variant="secondary" size="xs">
					<Search className="h-4 w-4 mr-1" />
					Search
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	),
};

export const CopyToClipboard: Story = {
	render: () => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [copied, setCopied] = useState(false);
		const handleCopy = () => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		};

		return (
			<InputGroup>
				<InputGroupInput
					value="https://example.com/share-link"
					readOnly
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						variant="ghost"
						size="icon-xs"
						onClick={handleCopy}
					>
						{copied ? (
							<Check className="h-4 w-4 text-green-500" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		);
	},
};

export const TextAddon: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>https://</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder="example.com" />
			</InputGroup>

			<InputGroup>
				<InputGroupInput placeholder="username" />
				<InputGroupAddon align="inline-end">
					<InputGroupText>@gmail.com</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const WithTextarea: Story = {
	render: () => (
		<InputGroup>
			<InputGroupAddon align="block-start">
				<InputGroupText>Message</InputGroupText>
			</InputGroupAddon>
			<InputGroupTextarea placeholder="Type your message here..." />
		</InputGroup>
	),
};

export const Invalid: Story = {
	render: () => (
		<InputGroup>
			<InputGroupAddon>
				<Mail className="h-4 w-4" />
			</InputGroupAddon>
			<InputGroupInput placeholder="Email address" aria-invalid="true" />
		</InputGroup>
	),
};
