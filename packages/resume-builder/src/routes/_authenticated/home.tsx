import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { HomePage } from '@/components/home/HomePage.tsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/home')({
	component: HomeRouteComponent,
});

function HomeRouteComponent() {
	return (
		<AppShell>
			<HomePage />
		</AppShell>
	);
}
