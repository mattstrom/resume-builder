import { useAuth0 } from '@auth0/auth0-react';
import {
	createRootRouteWithContext,
	Navigate,
	Outlet,
	useRouter,
} from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { App } from '../App.tsx';
import { AuthTokenBridge } from '../components/AuthTokenBridge.tsx';
import type { RootStore } from '../stores/root.store.ts';

interface RouterContext {
	store: RootStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	const { isAuthenticated, isLoading } = useAuth0();
	const router = useRouter();
	const { pathname } = router.state.location;

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

	const isAuthRoute = pathname === '/login' || pathname === '/logout';

	if (!isAuthenticated && !isAuthRoute) {
		return <Navigate to="/login" />;
	}

	// Auth routes render directly without App providers
	if (isAuthRoute) {
		return <Outlet />;
	}

	return (
		<>
			<AuthTokenBridge />
			<App />
		</>
	);
}
