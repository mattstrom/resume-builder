import { type FC } from 'react';
import { useResume } from '../Resume.provider.tsx';
import { ContactInformationSection } from './ContactInformationSection.tsx';

interface MastheadProps {}

export const Masthead: FC<MastheadProps> = () => {
	const { contactInformation } = useResume();

	return (
		<section className="masthead">
			<section className="left">
				<header className="name">
					<h1>{contactInformation.name}</h1>
				</header>
			</section>
			<ContactInformationSection />
		</section>
	);
};
