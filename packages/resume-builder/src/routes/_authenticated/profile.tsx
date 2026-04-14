import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { createFileRoute, Outlet } from '@tanstack/react-router';

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
