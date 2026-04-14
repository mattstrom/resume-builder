import { NarrativeEditor } from '@/components/profile/NarrativeEditor.tsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile/')({
	component: ProfileIndexComponent,
});

function ProfileIndexComponent() {
	return <NarrativeEditor />;
}
