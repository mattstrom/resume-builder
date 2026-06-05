import { createFileRoute } from '@tanstack/react-router';

import { FactsView } from '@/components/profile/FactsView.tsx';

export const Route = createFileRoute('/_authenticated/profile/facts')({
	component: FactsComponent,
});

function FactsComponent() {
	return <FactsView />;
}
