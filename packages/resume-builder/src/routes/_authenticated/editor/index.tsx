import { Centered } from '@/components/common/Centered.tsx';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { useFileManager } from '../../../components/FileManager';

export const Route = createFileRoute('/_authenticated/editor/')({
	component: EditorIndexComponent,
});

function EditorIndexComponent() {
	const { resumeData, selectedApplication } = useFileManager();

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
					Select an application from the explorer to get started
				</p>
			</Centered>
		);
	}

	return <Workspace />;
}
