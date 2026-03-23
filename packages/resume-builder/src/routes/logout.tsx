import { useAuth0 } from '@auth0/auth0-react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/logout')({
	component: LogoutPage,
});

function LogoutPage() {
	const { logout, isAuthenticated } = useAuth0();

	useEffect(() => {
		if (isAuthenticated) {
			logout({
				logoutParams: { returnTo: window.location.origin + '/login' },
			});
		}
	}, [isAuthenticated, logout]);

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return (
		<div className="min-h-screen bg-slate-950 flex items-center justify-center">
			<Loader2 className="h-8 w-8 animate-spin text-white" />
		</div>
	);
}
