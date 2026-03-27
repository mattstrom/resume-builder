import { useAuth0 } from '@auth0/auth0-react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { App } from '../App.tsx';
import { setTokenGetter } from '../utils/auth.ts';

export const Route = createFileRoute('/_authenticated')({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { isAuthenticated, getAccessTokenSilently } = useAuth0();
	const [authReady, setAuthReady] = useState(false);

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

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	if (!authReady) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-white" />
			</div>
		);
	}

	return <App />;
}
