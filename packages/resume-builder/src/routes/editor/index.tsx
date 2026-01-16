import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '../../components/Workspace.tsx';

export const Route = createFileRoute('/editor/')({
	component: EditorIndexComponent,
});

function EditorIndexComponent() {
	return <Workspace />;
}
