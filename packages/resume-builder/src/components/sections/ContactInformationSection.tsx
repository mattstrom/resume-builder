import {
	Envelope,
	GithubLogo,
	Globe,
	LinkedinLogo,
	MapPin,
	Phone,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { type FC } from 'react';
import { useResume } from '../Resume.provider.tsx';
import { Url } from '../Url.tsx';

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
			className={clsx(
				'contact-information flex flex-col gap-[0.1rem]',
				className,
			)}
			style={{
				fontStyle: 'normal',
			}}
		>
			<div className="contact-information-item location flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<MapPin size={24} weight="fill" />
				</div>
				<span>{contactInformation.location}</span>
			</div>
			<div className="contact-information-item phone-number flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Phone size={24} weight="fill" />
				</div>
				<a href={phoneNumberHref}>{contactInformation.phoneNumber}</a>
			</div>
			<div className="contact-information-item email flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Envelope size={24} />
				</div>
				<a href={emailHref}>{contactInformation.email}</a>
			</div>
			<div className="contact-information-item linkedin-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<LinkedinLogo size={24} weight="fill" />
				</div>
				<Url href={contactInformation.linkedInProfile} />
			</div>
			<div className="contact-information-item github-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<GithubLogo size={24} weight="fill" />
				</div>
				<Url href={contactInformation.githubProfile} />
			</div>
			{contactInformation.personalWebsite && (
				<div className="contact-information-item personal-website flex items-center gap-[5px]">
					<div className="icon flex items-center m-auto">
						<Globe size={24} />
					</div>
					<Url href={contactInformation.personalWebsite} />
				</div>
			)}
		</address>
	);
};
