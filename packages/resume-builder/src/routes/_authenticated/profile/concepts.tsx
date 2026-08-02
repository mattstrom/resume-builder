import { createFileRoute } from '@tanstack/react-router';

import { ConceptsView } from '@/components/profile/ConceptsView.tsx';

export const Route = createFileRoute('/_authenticated/profile/concepts')({
	component: ConceptsComponent,
});

function ConceptsComponent() {
	return <ConceptsView />;
}
