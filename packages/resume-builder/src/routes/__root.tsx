import { useAuth0 } from '@auth0/auth0-react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import type { RootStore } from '../stores/root.store.ts';

interface RouterContext {
	store: RootStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	const { isLoading } = useAuth0();

	// Auth0 is initializing or processing the callback redirect
	const queryString = window.location.search;
	const isProcessingCallback =
		isLoading ||
		queryString.includes('code=') ||
		queryString.includes('state=');

	if (isProcessingCallback) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-white" />
			</div>
		);
	}

	return <Outlet />;
}
