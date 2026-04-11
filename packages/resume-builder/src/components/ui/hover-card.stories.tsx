import type { Meta, StoryObj } from '@storybook/react-vite';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';

const meta = {
	title: 'UI/HoverCard',
	component: HoverCard,
	tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className="flex justify-center p-20">
			<HoverCard>
				<HoverCardTrigger asChild>
					<Button variant="link">@nextjs</Button>
				</HoverCardTrigger>
				<HoverCardContent className="w-80">
					<div className="flex justify-between space-x-4">
						<Avatar>
							<AvatarImage src="https://github.com/vercel.png" />
							<AvatarFallback>VC</AvatarFallback>
						</Avatar>
						<div className="space-y-1">
							<h4 className="text-sm font-semibold">@nextjs</h4>
							<p className="text-sm">
								The React Framework – created and maintained by
								@vercel.
							</p>
							<div className="flex items-center pt-2">
								<CalendarDays className="mr-2 h-4 w-4 opacity-70" />
								<span className="text-xs text-muted-foreground">
									Joined December 2021
								</span>
							</div>
						</div>
					</div>
				</HoverCardContent>
			</HoverCard>
		</div>
	),
};

export const CustomContent: Story = {
	render: () => (
		<div className="flex justify-center p-20">
			<HoverCard openDelay={200}>
				<HoverCardTrigger asChild>
					<Button variant="outline">Hover me</Button>
				</HoverCardTrigger>
				<HoverCardContent side="right">
					<p className="text-sm">
						This is a hover card with custom configuration.
					</p>
				</HoverCardContent>
			</HoverCard>
		</div>
	),
};
