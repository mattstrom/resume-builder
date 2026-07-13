import { createFileRoute } from "@tanstack/react-router";

import { SkillsSection } from "@/components/profile/BackgroundEditor.tsx";
import { ProfileSectionPage } from "@/components/profile/ProfileSectionPage.tsx";

export const Route = createFileRoute("/_authenticated/profile/skills")({
	component: SkillsComponent,
});

function SkillsComponent() {
	return (
		<ProfileSectionPage
			title="Skills"
			description="Your professional skills and proficiencies. Changes save automatically."
		>
			<SkillsSection showHeader={false} />
		</ProfileSectionPage>
	);
}
