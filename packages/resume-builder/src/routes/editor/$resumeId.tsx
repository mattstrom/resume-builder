import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../components/Workspace.tsx';
import { useFileManager } from '../../components/FileManager';
import { RouteLoading } from '../../components/RouteLoading.tsx';

export const Route = createFileRoute('/editor/$resumeId')({
	component: ApiResumeEditor,
});

function ApiResumeEditor() {
	const { resumeId } = Route.useParams();
	const { selectApiResume, selectedApiResumeId, isLoading, error } = useFileManager();

	useEffect(() => {
		// Only load if the URL resumeId doesn't match current selection
		if (resumeId !== selectedApiResumeId) {
			selectApiResume(resumeId);
		}
	}, [resumeId, selectedApiResumeId, selectApiResume]);

	if (isLoading) {
		return <RouteLoading />;
	}

	if (error) {
		throw new Error(error);
	}

	return <Workspace />;
}
