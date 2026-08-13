import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile/knowledge/$knowledgeId')({
	component: KnowledgeDetailRoute,
});

function KnowledgeDetailRoute() {
	return null;
}
