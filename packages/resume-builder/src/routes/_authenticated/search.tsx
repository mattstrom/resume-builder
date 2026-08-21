import { createFileRoute } from '@tanstack/react-router';

import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { AdvancedSearchPage } from '@/components/search/AdvancedSearchPage.tsx';

export const Route = createFileRoute('/_authenticated/search')({
	component: AdvancedSearchRoute,
});

function AdvancedSearchRoute() {
	return (
		<AppShell>
			<AdvancedSearchPage />
		</AppShell>
	);
}
