import { JobPreferencesEditor } from '@/components/profile/JobPreferencesEditor.tsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile/preferences')({
	component: JobPreferencesComponent,
});

function JobPreferencesComponent() {
	return <JobPreferencesEditor />;
}
