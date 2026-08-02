import { createFileRoute } from "@tanstack/react-router";

import { ProjectsSection } from "@/components/profile/BackgroundEditor.tsx";
import { ProfileSectionPage } from "@/components/profile/ProfileSectionPage.tsx";
import { bulletDeepLinkSearchSchema } from "@/lib/bullet-deep-link.ts";

export const Route = createFileRoute("/_authenticated/profile/projects")({
	validateSearch: bulletDeepLinkSearchSchema,
	component: ProjectsComponent,
});

function ProjectsComponent() {
	const { bulletId } = Route.useSearch();

	return (
		<ProfileSectionPage
			title="Projects"
			description="Projects that demonstrate your experience. Changes save automatically."
		>
			<ProjectsSection showHeader={false} bulletId={bulletId} />
		</ProfileSectionPage>
	);
}
