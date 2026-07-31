import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Combobox, type ComboboxOption, type ComboboxProps } from './combobox';

const technologies: ComboboxOption[] = [
	{
		value: 'react',
		label: 'React',
		description: 'Web development framework',
	},
	{
		value: 'postgresql',
		label: 'PostgreSQL',
		description: 'Database management system',
	},
	{
		value: 'kubernetes',
		label: 'Kubernetes',
		description: 'Container orchestration software',
	},
	{
		value: 'typescript',
		label: 'TypeScript',
		description: 'Programming language',
	},
];

function StatefulCombobox(props: ComboboxProps) {
	const [value, setValue] = useState(props.value);
	const [selectedValue, setSelectedValue] = useState(props.selectedValue);

	return (
		<Combobox
			{...props}
			value={value}
			selectedValue={selectedValue}
			onValueChange={(nextValue, option) => {
				setValue(nextValue);
				setSelectedValue(option?.value);
			}}
		/>
	);
}

const meta = {
	title: 'UI/Combobox',
	component: Combobox,
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
	args: {
		options: technologies,
		value: '',
		onValueChange: () => undefined,
		placeholder: 'Select or enter a technology',
		searchPlaceholder: 'Search technologies',
		emptyMessage: 'No matches. You can use the value you entered.',
		groupLabel: 'Suggestions',
	},
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => <StatefulCombobox {...args} />,
};

export const Loading: Story = {
	args: {
		options: [],
		open: true,
		isLoading: true,
		loadingMessage: 'Loading suggestions…',
		shouldFilter: false,
	},
};

export const Empty: Story = {
	args: {
		options: [],
		open: true,
		emptyMessage: 'No technologies available yet.',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		value: 'React',
		selectedValue: 'react',
	},
};
