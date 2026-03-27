import { useAuth0 } from '@auth0/auth0-react';
import { createFileRoute, Navigate, redirect } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { App } from '../App.tsx';
import { ensureAuthToken } from '../utils/auth.ts';

export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async () => {
		try {
			await ensureAuthToken();
		} catch {
			throw redirect({ to: '/login' });
		}
	},
	component: AuthenticatedLayout,
	pendingComponent: () => (
		<div className="min-h-screen bg-slate-950 flex items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-white" />
		</div>
	),
});

function AuthenticatedLayout() {
	const { isAuthenticated } = useAuth0();

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return <App />;
}
