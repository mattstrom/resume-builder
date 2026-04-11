import type { Meta, StoryObj } from '@storybook/react';
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from './carousel';
import { Card, CardContent } from './card';

const meta: Meta<typeof Carousel> = {
	title: 'UI/Carousel',
	component: Carousel,
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Carousel>;

export const Default: Story = {
	render: (args) => (
		<div className="flex justify-center px-12">
			<Carousel {...args} className="w-full max-w-xs">
				<CarouselContent>
					{Array.from({ length: 5 }).map((_, index) => (
						<CarouselItem key={index}>
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<span className="text-4xl font-semibold">
											{index + 1}
										</span>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex justify-center px-12">
			<Carousel
				{...args}
				opts={{
					align: 'start',
				}}
				className="w-full max-w-sm"
			>
				<CarouselContent>
					{Array.from({ length: 5 }).map((_, index) => (
						<CarouselItem
							key={index}
							className="md:basis-1/2 lg:basis-1/3"
						>
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<span className="text-3xl font-semibold">
											{index + 1}
										</span>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const Vertical: Story = {
	args: {
		orientation: 'vertical',
	},
	render: (args) => (
		<div className="flex justify-center py-12">
			<Carousel
				{...args}
				opts={{
					align: 'start',
				}}
				className="w-full max-w-xs"
			>
				<CarouselContent className="-mt-1 h-[200px]">
					{Array.from({ length: 5 }).map((_, index) => (
						<CarouselItem key={index} className="pt-1 md:basis-1/2">
							<div className="p-1">
								<Card>
									<CardContent className="flex items-center justify-center p-6">
										<span className="text-3xl font-semibold">
											{index + 1}
										</span>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};
