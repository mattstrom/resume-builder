import { BackgroundEditor } from '@/components/profile/BackgroundEditor.tsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile/background')({
	component: BackgroundComponent,
});

function BackgroundComponent() {
	return <BackgroundEditor />;
}
