import { observer } from 'mobx-react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { useStore } from '../../stores/store.provider.tsx';

const LogoutPage = observer(() => {
	const { authStore } = useStore();

	useEffect(() => {
		if (authStore.isAuthenticated) {
			authStore.logout();
		}
	}, [authStore, authStore.isAuthenticated]);

	if (!authStore.isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-foreground" />
		</div>
	);
});

export const Route = createFileRoute('/(public)/logout')({
	component: LogoutPage,
});
