import type { Meta, StoryObj } from '@storybook/react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './accordion';

const meta: Meta<typeof Accordion> = {
	title: 'UI/Accordion',
	component: Accordion,
	tags: ['autodocs'],
	argTypes: {
		type: {
			control: 'select',
			options: ['single', 'multiple'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
	render: (args) => (
		<Accordion {...args} type="single" collapsible className="w-full">
			<AccordionItem value="item-1">
				<AccordionTrigger>Is it accessible?</AccordionTrigger>
				<AccordionContent>
					Yes. It adheres to the WAI-ARIA design pattern.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-2">
				<AccordionTrigger>Is it styled?</AccordionTrigger>
				<AccordionContent>
					Yes. It comes with default styles that matches the other
					components&apos; aesthetic.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-3">
				<AccordionTrigger>Is it animated?</AccordionTrigger>
				<AccordionContent>
					Yes. It&apos;s animated by default, but you can disable it
					if you prefer.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const Multiple: Story = {
	render: (args) => (
		<Accordion {...args} type="multiple" className="w-full">
			<AccordionItem value="item-1">
				<AccordionTrigger>Item 1</AccordionTrigger>
				<AccordionContent>
					This is the first item's content.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-2">
				<AccordionTrigger>Item 2</AccordionTrigger>
				<AccordionContent>
					This is the second item's content.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};
