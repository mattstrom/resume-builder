import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../components/Workspace.tsx';
import { useFileManager } from '../../components/FileManager';

export const Route = createFileRoute('/editor/')({
	component: EditorIndexComponent,
});

function EditorIndexComponent() {
	const { resumeData } = useFileManager();

	useEffect(() => {
		if (resumeData) {
			const name = resumeData.data.name;
			const company = resumeData.company;
			const titleParts = ['Resume', name];
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
	}, [resumeData]);

	// Show empty state if no resume is loaded
	if (!resumeData) {
		return (
			<div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-6 text-center">
				<h1 className="text-3xl font-bold mb-4 text-white">
					No Resume Selected
				</h1>
				<p className="text-white/70">
					Select a resume from the file manager to get started
				</p>
			</div>
		);
	}

	return <Workspace />;
}
