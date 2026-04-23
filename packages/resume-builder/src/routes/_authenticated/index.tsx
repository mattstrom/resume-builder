import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
	component: IndexComponent,
});

function IndexComponent() {
	return <Navigate to="/home" />;
}
