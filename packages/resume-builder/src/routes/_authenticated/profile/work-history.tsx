import { createFileRoute } from '@tanstack/react-router';

import { JobsSection } from '@/components/profile/BackgroundEditor.tsx';
import { ProfileSectionPage } from '@/components/profile/ProfileSectionPage.tsx';
import { bulletDeepLinkSearchSchema } from '@/lib/bullet-deep-link.ts';

export const Route = createFileRoute('/_authenticated/profile/work-history')({
	validateSearch: bulletDeepLinkSearchSchema,
	component: WorkHistoryComponent,
});

function WorkHistoryComponent() {
	const { bulletId } = Route.useSearch();

	return (
		<ProfileSectionPage
			title="Work History"
			description="Your employment experience. Changes save automatically."
		>
			<JobsSection showHeader={false} bulletId={bulletId} />
		</ProfileSectionPage>
	);
}
