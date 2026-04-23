import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({
	beforeLoad: ({ context }) => {
		const { authStore } = context.store;

		if (authStore.isAuthenticated) {
			return redirect({ to: '/home' });
		} else {
			return redirect({ to: '/login' });
		}
	},
	component: () => <Outlet />,
});
