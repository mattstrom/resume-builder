import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile/')({
	component: ProfileIndexComponent,
});

function ProfileIndexComponent() {
	return <AppShell />;
}
