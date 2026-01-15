import clsx from 'clsx';
import { type FC } from 'react';
import { Url } from '../Url.tsx';
import { useResume } from '../Resume.provider.tsx';
import {
	Email,
	GitHub,
	Language,
	LinkedIn,
	LocationOn,
	Phone,
} from '@mui/icons-material';
import { css } from '@emotion/react';

interface ContactInformationSectionProps {
	className?: string;
}

const classes = {
	address: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.1rem',
		'& > div': {
			display: 'flex',
			alignItems: 'center',
			alignContent: 'center',
			gap: 5,
		},
		'& > .contact-information-item': {
			display: 'flex',
			gridTemplateColumns: '24px 1fr',
			gridTemplateRows: 'min-content',
			alignItems: 'center',
			'& > svg': {
				alignSelf: 'center',
			},
		},
		'& .icon': {
			display: 'flex',
			alignItems: 'center',
			margin: 'auto',
		},
	}),
};

export const ContactInformationSection: FC<ContactInformationSectionProps> = ({
	className,
}) => {
	const { contactInformation } = useResume();
	const emailHref = `mailto:${contactInformation.email}`;
	const phoneNumberHref = `tel:${contactInformation.phoneNumber}`;

	return (
		<address
			css={classes.address}
			className={clsx('contact-information', className)}
		>
			<div className="contact-information-item location">
				<div className="icon">
					<LocationOn />
				</div>
				<span>{contactInformation.location}</span>
			</div>
			<div className="contact-information-item phone-number">
				<div className="icon">
					<Phone fontSize="small" />
				</div>
				<a href={phoneNumberHref}>{contactInformation.phoneNumber}</a>
			</div>
			<div className="contact-information-item email">
				<div className="icon">
					<Email />
				</div>
				<a href={emailHref}>{contactInformation.email}</a>
			</div>
			<div className="contact-information-item linkedin-profile">
				<div className="icon">
					<LinkedIn />
				</div>
				<Url href={contactInformation.linkedInProfile} />
			</div>
			<div className="contact-information-item github-profile">
				<div className="icon">
					<GitHub />
				</div>
				<Url href={contactInformation.githubProfile} />
			</div>
			{contactInformation.personalWebsite && (
				<div className="contact-information-item personal-website">
					<div className="icon">
						<Language />
					</div>
					<Url href={contactInformation.personalWebsite} />
				</div>
			)}
		</address>
	);
};
