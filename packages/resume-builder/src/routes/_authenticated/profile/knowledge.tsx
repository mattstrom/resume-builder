import { createFileRoute } from '@tanstack/react-router';

import { ProfileKnowledgeView } from '@/components/profile/ProfileKnowledgeView.tsx';

export const Route = createFileRoute('/_authenticated/profile/knowledge')({
	component: ProfileKnowledgeView,
});
