import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type ChangeEvent, type FC } from 'react';

interface BasicInfo {
	name: string;
	title: string;
	summary: string;
}

interface BasicInfoSectionProps {
	data: BasicInfo;
	onChange: (data: BasicInfo) => void;
}

export const BasicInfoSection: FC<BasicInfoSectionProps> = ({
	data,
	onChange,
}) => {
	const handleChange =
		(field: keyof BasicInfo) =>
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			onChange({ ...data, [field]: e.target.value });
		};

	return (
		<Accordion type="single" defaultValue="basic-info" collapsible>
			<AccordionItem
				value="basic-info"
				className="bg-card/5 border-white/10 px-4"
			>
				<AccordionTrigger className="text-sm hover:no-underline">
					Basic Information
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={data.name}
							onChange={handleChange('name')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							value={data.title}
							onChange={handleChange('title')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="summary">Summary</Label>
						<Textarea
							id="summary"
							value={data.summary}
							onChange={handleChange('summary')}
							rows={5}
						/>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
