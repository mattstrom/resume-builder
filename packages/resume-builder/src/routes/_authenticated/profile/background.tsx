import { createFileRoute } from '@tanstack/react-router';

import { ContactSection, EducationSection } from '@/components/profile/BackgroundEditor.tsx';
import { ProfileSectionPage } from '@/components/profile/ProfileSectionPage.tsx';

export const Route = createFileRoute('/_authenticated/profile/background')({
	component: BackgroundComponent,
});

function BackgroundComponent() {
	return (
		<ProfileSectionPage
			title="Personal Details"
			description="Your contact details and education. Changes save automatically."
		>
			<ContactSection />
			<EducationSection />
		</ProfileSectionPage>
	);
}
