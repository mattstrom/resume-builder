import { observer } from 'mobx-react';
import { createFileRoute, Navigate, redirect } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { App } from '../App.tsx';
import { useStore } from '../stores/store.provider.tsx';
import { ensureAuthToken } from '../utils/auth.ts';

const AuthenticatedLayout = observer(() => {
	const { authStore } = useStore();

	if (!authStore.isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return <App />;
});

export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async () => {
		try {
			await ensureAuthToken();
		} catch (err) {
			throw redirect({ to: '/login' });
		}
	},
	component: AuthenticatedLayout,
	pendingComponent: () => (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-foreground" />
		</div>
	),
});
