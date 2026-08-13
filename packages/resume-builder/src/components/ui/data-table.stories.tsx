import type { Meta, StoryObj } from '@storybook/react-vite';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

import { Button } from './button';
import { DataTable, type DataTableFeatures, type DataTableProps } from './data-table';

interface Application {
	company: string;
	role: string;
	status: 'Applied' | 'Interview' | 'Offer';
}

const columnHelper = createColumnHelper<DataTableFeatures, Application>();

const columns = columnHelper.columns([
	columnHelper.accessor('company', {
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Company
				<ArrowUpDown data-icon="inline-end" />
			</Button>
		),
	}),
	columnHelper.accessor('role', {
		header: 'Role',
	}),
	columnHelper.accessor('status', {
		header: 'Status',
	}),
]);

const data: Application[] = [
	{ company: 'Acme', role: 'Staff Engineer', status: 'Interview' },
	{ company: 'Globex', role: 'Frontend Engineer', status: 'Applied' },
	{ company: 'Initech', role: 'Engineering Manager', status: 'Offer' },
	{ company: 'Umbrella', role: 'Platform Engineer', status: 'Applied' },
	{ company: 'Wonka Industries', role: 'Product Engineer', status: 'Interview' },
];

function ApplicationDataTable(props: DataTableProps<Application>) {
	return <DataTable {...props} />;
}

const meta = {
	title: 'UI/DataTable',
	component: ApplicationDataTable,
	tags: ['autodocs'],
} satisfies Meta<typeof ApplicationDataTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		columns,
		data,
		initialPageSize: 3,
	},
};

export const Empty: Story = {
	args: {
		columns,
		data: [],
		emptyMessage: 'No applications found.',
	},
};
