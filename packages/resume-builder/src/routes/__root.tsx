import { useAuth0 } from '@auth0/auth0-react';
import {
	createRootRouteWithContext,
	Navigate,
	Outlet,
	useRouter,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { App } from '../App.tsx';
import { setTokenGetter } from '../utils/auth.ts';
import type { RootStore } from '../stores/root.store.ts';

interface RouterContext {
	store: RootStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function LoadingScreen() {
	return (
		<div className="min-h-screen bg-slate-950 flex items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-white" />
		</div>
	);
}

function RootComponent() {
	const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
	const [authReady, setAuthReady] = useState(false);
	const router = useRouter();
	const { pathname } = router.state.location;

	useEffect(() => {
		if (!isAuthenticated) return;

		setTokenGetter(() =>
			getAccessTokenSilently({
				authorizationParams: {
					audience: __CONFIG__.auth0.audience,
				},
			}),
		);

		// Pre-fetch the token so it's cached before child routes render
		getAccessTokenSilently({
			authorizationParams: {
				audience: __CONFIG__.auth0.audience,
			},
		}).then(() => setAuthReady(true));
	}, [isAuthenticated, getAccessTokenSilently]);

	// Auth0 is initializing or processing the callback redirect
	const queryString = window.location.search;
	const isProcessingCallback =
		isLoading ||
		queryString.includes('code=') ||
		queryString.includes('state=');

	if (isProcessingCallback) {
		return <LoadingScreen />;
	}

	const isAuthRoute = pathname === '/login' || pathname === '/logout';

	if (!isAuthenticated && !isAuthRoute) {
		return <Navigate to="/login" />;
	}

	// Auth routes render directly without App providers
	if (isAuthRoute) {
		return <Outlet />;
	}

	// Wait for the auth token to be fetched before rendering the app
	if (!authReady) {
		return <LoadingScreen />;
	}

	return <App />;
}
