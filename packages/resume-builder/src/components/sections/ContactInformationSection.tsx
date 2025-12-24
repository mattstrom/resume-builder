import clsx from 'clsx';
import { type FC } from 'react';
import { Url } from '../Url.tsx';
import { useResume } from '../Resume.provider.tsx';

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
		<address className={clsx('contact-information', className)}>
			<div className="phone-number">
				<a href={phoneNumberHref}>{contactInformation.phoneNumber}</a>
			</div>
			<div className="email">
				<a href={emailHref}>{contactInformation.email}</a>
			</div>
			<div className="linkedin-profile">
				<Url href={contactInformation.linkedInProfile} />
			</div>
			<div className="github-profile">
				<Url href={contactInformation.githubProfile} />
			</div>
		</address>
	);
};
