import { Envelope, GithubLogo, Globe, LinkedinLogo, MapPin, Phone } from '@phosphor-icons/react';
import clsx from 'clsx';
import { type FC } from 'react';

import { InlineEditor } from '@/components/InlineEditor.tsx';
import { formatWebUrl, normalizeWebUrl } from '@/components/ResumeLink.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { RESUME_SECTION_IDS } from './section-anchors.ts';

interface ContactInformationSectionProps {
	className?: string;
}

export const ContactInformationSection: FC<ContactInformationSectionProps> = ({ className }) => {
	const { contactInformation } = useResume();
	const resumeId = useResumeId();
	const emailHref = `mailto:${contactInformation.email}`;
	const phoneNumberHref = `tel:${contactInformation.phoneNumber}`;

	return (
		<address
			id={RESUME_SECTION_IDS.contactInformation}
			className={clsx('contact-information flex flex-col gap-[0.1rem]', className)}
			style={{
				fontStyle: 'normal',
			}}
		>
			<div className="contact-information-item location flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<MapPin size={24} weight="fill" />
				</div>
				<InlineEditor
					path="data.contactInformation.location"
					value={contactInformation.location}
					resumeId={resumeId}
				/>
			</div>
			<div className="contact-information-item phone-number flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Phone size={24} weight="fill" />
				</div>
				<InlineEditor
					path="data.contactInformation.phoneNumber"
					value={contactInformation.phoneNumber}
					resumeId={resumeId}
					href={phoneNumberHref}
				/>
			</div>
			<div className="contact-information-item email flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<Envelope size={24} />
				</div>
				<InlineEditor
					path="data.contactInformation.email"
					value={contactInformation.email}
					resumeId={resumeId}
					href={emailHref}
				/>
			</div>
			<div className="contact-information-item linkedin-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<LinkedinLogo size={24} weight="fill" />
				</div>
				<InlineEditor
					path="data.contactInformation.linkedInProfile"
					value={contactInformation.linkedInProfile}
					resumeId={resumeId}
					href={normalizeWebUrl(contactInformation.linkedInProfile) ?? undefined}
				>
					{formatWebUrl(contactInformation.linkedInProfile)}
				</InlineEditor>
			</div>
			<div className="contact-information-item github-profile flex items-center gap-[5px]">
				<div className="icon flex items-center m-auto">
					<GithubLogo size={24} weight="fill" />
				</div>
				<InlineEditor
					path="data.contactInformation.githubProfile"
					value={contactInformation.githubProfile}
					resumeId={resumeId}
					href={normalizeWebUrl(contactInformation.githubProfile) ?? undefined}
				>
					{formatWebUrl(contactInformation.githubProfile)}
				</InlineEditor>
			</div>
			{contactInformation.personalWebsite && (
				<div className="contact-information-item personal-website flex items-center gap-[5px]">
					<div className="icon flex items-center m-auto">
						<Globe size={24} />
					</div>
					<InlineEditor
						path="data.contactInformation.personalWebsite"
						value={contactInformation.personalWebsite}
						resumeId={resumeId}
						href={normalizeWebUrl(contactInformation.personalWebsite) ?? undefined}
					>
						{formatWebUrl(contactInformation.personalWebsite)}
					</InlineEditor>
				</div>
			)}
		</address>
	);
};
