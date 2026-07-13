import { createFileRoute } from "@tanstack/react-router";

import { JobsSection } from "@/components/profile/BackgroundEditor.tsx";
import { ProfileSectionPage } from "@/components/profile/ProfileSectionPage.tsx";

export const Route = createFileRoute("/_authenticated/profile/work-history")({
	component: WorkHistoryComponent,
});

function WorkHistoryComponent() {
	return (
		<ProfileSectionPage title="Work History" description="Your employment experience. Changes save automatically.">
			<JobsSection showHeader={false} />
		</ProfileSectionPage>
	);
}
