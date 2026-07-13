import { createFileRoute } from "@tanstack/react-router";

import { ProjectsSection } from "@/components/profile/BackgroundEditor.tsx";
import { ProfileSectionPage } from "@/components/profile/ProfileSectionPage.tsx";

export const Route = createFileRoute("/_authenticated/profile/projects")({
	component: ProjectsComponent,
});

function ProjectsComponent() {
	return (
		<ProfileSectionPage
			title="Projects"
			description="Projects that demonstrate your experience. Changes save automatically."
		>
			<ProjectsSection showHeader={false} />
		</ProfileSectionPage>
	);
}
