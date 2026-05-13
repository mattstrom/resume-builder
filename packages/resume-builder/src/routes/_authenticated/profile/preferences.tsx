import { createFileRoute } from '@tanstack/react-router';

import { JobPreferencesEditor } from '@/components/profile/JobPreferencesEditor.tsx';

export const Route = createFileRoute('/_authenticated/profile/preferences')({
	component: JobPreferencesComponent,
});

function JobPreferencesComponent() {
	return <JobPreferencesEditor />;
}
