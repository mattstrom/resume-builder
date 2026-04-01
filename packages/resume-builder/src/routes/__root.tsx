import { observer } from 'mobx-react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import type { RootStore } from '../stores/root.store.ts';
import { useStore } from '../stores/store.provider.tsx';

interface RouterContext {
	store: RootStore;
}

const RootComponent = observer(() => {
	const { authStore } = useStore();

	// Auth0 is initializing or processing the callback redirect
	const queryString = window.location.search;
	const isProcessingCallback =
		authStore.isLoading ||
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
});

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	beforeLoad: async ({ context }) => {
		const { authStore } = context.store;

		try {
			await authStore.ensureToken();
		} catch (error) {
			console.error('Error during authentication:', error);
		}
	},
});
