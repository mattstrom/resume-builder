import clsx from 'clsx';
import { type FC } from 'react';
import { Url } from '../Url.tsx';
import { useResume } from '../Resume.provider.tsx';
import {
	Mail,
	Github,
	Globe,
	Linkedin,
	MapPin,
	Phone,
} from 'lucide-react';

interface ContactInformationSectionProps {
	className?: string;
}

export const ContactInformationSection: FC<ContactInformationSectionProps> = ({
	className,
}) => {
	const { contactInformation } = useResume();
	const emailHref = `mailto:${contactInformation.email}`;
	const phoneNumberHref = `tel:${contactInformation.phoneNumber}`;

	return (
		<address
			className={clsx('contact-information flex flex-col gap-[0.1rem]', className)}
			style={{
				fontStyle: 'normal',
			}}
		>
			<div className="contact-information-item location flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<MapPin size={20} />
				</div>
				<span>{contactInformation.location}</span>
			</div>
			<div className="contact-information-item phone-number flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Phone size={16} />
				</div>
				<a href={phoneNumberHref}>{contactInformation.phoneNumber}</a>
			</div>
			<div className="contact-information-item email flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Mail size={20} />
				</div>
				<a href={emailHref}>{contactInformation.email}</a>
			</div>
			<div className="contact-information-item linkedin-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Linkedin size={20} />
				</div>
				<Url href={contactInformation.linkedInProfile} />
			</div>
			<div className="contact-information-item github-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Github size={20} />
				</div>
				<Url href={contactInformation.githubProfile} />
			</div>
			{contactInformation.personalWebsite && (
				<div className="contact-information-item personal-website flex items-center gap-[5px]">
					<div className="icon flex items-center m-auto">
						<Globe size={20} />
					</div>
					<Url href={contactInformation.personalWebsite} />
				</div>
			)}
		</address>
	);
};
