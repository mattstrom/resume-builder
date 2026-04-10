import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

const meta = {
	title: 'UI/ScrollArea',
	component: ScrollArea,
	tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const tags = Array.from({ length: 50 }).map(
	(_, i, a) => `v1.2.0-beta.${a.length - i}`,
);

export const Default: Story = {
	render: () => (
		<ScrollArea className="h-72 w-48 rounded-md border">
			<div className="p-4">
				<h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
				{tags.map((tag) => (
					<div key={tag}>
						<div className="text-sm">{tag}</div>
						<Separator className="my-2" />
					</div>
				))}
			</div>
		</ScrollArea>
	),
};

export const Horizontal: Story = {
	render: () => (
		<ScrollArea className="w-96 whitespace-nowrap rounded-md border">
			<div className="flex w-max space-x-4 p-4">
				{tags.map((tag) => (
					<div
						key={tag}
						className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-md bg-muted text-sm"
					>
						{tag}
					</div>
				))}
			</div>
		</ScrollArea>
	),
};
