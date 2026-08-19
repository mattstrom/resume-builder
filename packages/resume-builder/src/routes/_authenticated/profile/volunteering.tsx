import { createFileRoute } from '@tanstack/react-router';

import { VolunteeringSection } from '@/components/profile/BackgroundEditor.tsx';
import { ProfileSectionPage } from '@/components/profile/ProfileSectionPage.tsx';
import { bulletDeepLinkSearchSchema } from '@/lib/bullet-deep-link.ts';

export const Route = createFileRoute('/_authenticated/profile/volunteering')({
	validateSearch: bulletDeepLinkSearchSchema,
	component: VolunteeringComponent,
});

function VolunteeringComponent() {
	const { bulletId } = Route.useSearch();

	return (
		<ProfileSectionPage
			title="Volunteering"
			description="Your volunteer experience and community involvement. Changes save automatically."
		>
			<VolunteeringSection showHeader={false} bulletId={bulletId} />
		</ProfileSectionPage>
	);
}
