import { type FC } from 'react';
import { Url } from './Url.tsx';
import { useResume } from './Resume.provider.tsx';

interface MastheadProps {}

export const Masthead: FC<MastheadProps> = () => {
	const { contactInformation } = useResume();
	const emailHref = `mailto:${contactInformation.email}`;
	const phoneNumberHref = `tel:${contactInformation.phoneNumber}`;

	return (
		<section className="masthead">
			<section className="left">
				<header className="name">
					<h1>{contactInformation.name}</h1>
				</header>
			</section>
			<address className="right">
				<div className="phone-number">
					<a href={phoneNumberHref}>
						{contactInformation.phoneNumber}
					</a>
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
		</section>
	);
};
