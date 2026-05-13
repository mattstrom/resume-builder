import { createFileRoute } from '@tanstack/react-router';

import { BackgroundEditor } from '@/components/profile/BackgroundEditor.tsx';

export const Route = createFileRoute('/_authenticated/profile/background')({
	component: BackgroundComponent,
});

function BackgroundComponent() {
	return <BackgroundEditor />;
}
