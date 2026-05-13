import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/app-shell/AppShell.tsx';

export const Route = createFileRoute('/_authenticated/profile')({
	component: ProfileLayout,
});

function ProfileLayout() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
