import { Centered } from '@/components/common/Centered.tsx';
import { createFileRoute } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { useStore } from '../../../stores/store.provider.tsx';

const EditorIndexComponent = observer(function EditorIndexComponent() {
	const { editorStore } = useStore();
	const { resumeData, selectedApplication } = editorStore;

	useEffect(() => {
		if (resumeData) {
			const name = resumeData.data.name;
			const company = selectedApplication?.company ?? resumeData.company;
			const titleParts = ['Application', name];
			if (company) {
				titleParts.push(company);
			}
			document.title = titleParts.join(' - ');
		} else {
			document.title = 'Resume Builder';
		}

		return () => {
			document.title = 'Resume Builder';
		};
	}, [resumeData, selectedApplication]);

	if (!resumeData) {
		return (
			<Centered>
				<h1 className="text-3xl font-bold mb-4 text-foreground">
					No Linked Resume
				</h1>
				<p className="text-muted-foreground">
					Select an application from the sidebar to get started
				</p>
			</Centered>
		);
	}

	return <Workspace />;
});

export const Route = createFileRoute('/_authenticated/editor/')({
	component: EditorIndexComponent,
});
