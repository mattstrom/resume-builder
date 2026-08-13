import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ProfileKnowledgeView } from '@/components/profile/ProfileKnowledgeView.tsx';

export const Route = createFileRoute('/_authenticated/profile/knowledge')({
	component: KnowledgeRoute,
});

function KnowledgeRoute() {
	return (
		<>
			<ProfileKnowledgeView />
			<Outlet />
		</>
	);
}
