import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ChangeEvent, type FC } from 'react';

interface ContactInfo {
	location: string;
	email: string;
	phoneNumber: string;
	linkedInProfile: string;
	githubProfile: string;
	personalWebsite: string;
}

interface ContactInfoSectionProps {
	data: ContactInfo;
	onChange: (data: ContactInfo) => void;
}

export const ContactInfoSection: FC<ContactInfoSectionProps> = ({
	data,
	onChange,
}) => {
	const handleChange =
		(field: keyof ContactInfo) => (e: ChangeEvent<HTMLInputElement>) => {
			onChange({ ...data, [field]: e.target.value });
		};

	return (
		<Accordion type="single" collapsible>
			<AccordionItem
				value="contact-info"
				className="bg-card/5 border-border/50 px-4"
			>
				<AccordionTrigger className="text-sm hover:no-underline">
					Contact Information
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							value={data.location}
							onChange={handleChange('location')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={data.email}
							onChange={handleChange('email')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="phoneNumber">Phone Number</Label>
						<Input
							id="phoneNumber"
							value={data.phoneNumber}
							onChange={handleChange('phoneNumber')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="linkedInProfile">
							LinkedIn Profile
						</Label>
						<Input
							id="linkedInProfile"
							value={data.linkedInProfile}
							onChange={handleChange('linkedInProfile')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="githubProfile">GitHub Profile</Label>
						<Input
							id="githubProfile"
							value={data.githubProfile}
							onChange={handleChange('githubProfile')}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="personalWebsite">
							Personal Website
						</Label>
						<Input
							id="personalWebsite"
							value={data.personalWebsite}
							onChange={handleChange('personalWebsite')}
						/>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
