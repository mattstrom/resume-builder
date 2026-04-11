import { type FC } from 'react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { EducationTransferList } from '../components/EducationTransferList';

interface EducationSectionProps {
	selectedIds: string[];
	onChange: (selectedIds: string[]) => void;
}

export const EducationSection: FC<EducationSectionProps> = ({
	selectedIds,
	onChange,
}) => {
	return (
		<Accordion type="single" collapsible>
			<AccordionItem
				value="education"
				className="bg-card/5 border-border/50 px-4"
			>
				<AccordionTrigger className="text-sm hover:no-underline">
					Education
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					<EducationTransferList
						selectedIds={selectedIds}
						onChange={onChange}
					/>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
