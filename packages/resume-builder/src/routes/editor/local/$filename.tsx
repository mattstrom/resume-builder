import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { useFileManager } from '../../../components/FileManager';
import { RouteLoading } from '../../../components/RouteLoading.tsx';

export const Route = createFileRoute('/editor/local/$filename')({
	component: LocalFileEditor,
});

function LocalFileEditor() {
	const { filename } = Route.useParams();
	const {
		selectFile,
		selectedFile,
		isLoading,
		error,
		directoryHandle,
		resumeData,
	} = useFileManager();

	useEffect(() => {
		// Only load if directory is attached and filename doesn't match current selection
		if (directoryHandle && filename !== selectedFile) {
			selectFile(filename);
		}
	}, [filename, selectedFile, selectFile, directoryHandle]);

	useEffect(() => {
		if (resumeData) {
			const name = resumeData.data.name;
			const company = resumeData.company;
			const titleParts = ['Resume', name];
			if (company) {
				titleParts.push(company);
			}
			document.title = titleParts.join(' - ');
		}

		return () => {
			document.title = 'Resume Builder';
		};
	}, [resumeData]);

	// If no directory is attached, redirect to editor
	if (!directoryHandle) {
		return <Navigate to="/editor" />;
	}

	if (isLoading) {
		return <RouteLoading />;
	}

	if (error) {
		throw new Error(error);
	}

	return <Workspace />;
}
