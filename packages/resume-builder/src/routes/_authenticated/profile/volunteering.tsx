import { createFileRoute } from "@tanstack/react-router";

import { VolunteeringSection } from "@/components/profile/BackgroundEditor.tsx";
import { ProfileSectionPage } from "@/components/profile/ProfileSectionPage.tsx";

export const Route = createFileRoute("/_authenticated/profile/volunteering")({
	component: VolunteeringComponent,
});

function VolunteeringComponent() {
	return (
		<ProfileSectionPage
			title="Volunteering"
			description="Your volunteer experience and community involvement. Changes save automatically."
		>
			<VolunteeringSection showHeader={false} />
		</ProfileSectionPage>
	);
}
