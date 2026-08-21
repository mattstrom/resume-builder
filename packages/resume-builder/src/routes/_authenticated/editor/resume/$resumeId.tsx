import { createFileRoute } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { useEffect } from 'react';

import { RouteLoading } from '@/components/RouteLoading.tsx';
import { Workspace } from '@/components/Workspace.tsx';
import { useStore } from '@/stores/store.provider.tsx';

const StandaloneResumeEditor = observer(function StandaloneResumeEditor() {
	const { resumeId } = Route.useParams();
	const { editorStore } = useStore();

	useEffect(() => {
		void editorStore.selectStandaloneResume(resumeId);
	}, [editorStore, resumeId]);

	useEffect(() => {
		if (editorStore.resumeData) {
			document.title = `${editorStore.resumeData.name || 'Resume'} - Resume Builder`;
		}
		return () => {
			document.title = 'Resume Builder';
		};
	}, [editorStore.resumeData]);

	if (editorStore.error) throw new Error(editorStore.error);
	if (editorStore.isLoading || editorStore.resumeData?._id !== resumeId) {
		return <RouteLoading />;
	}
	return <Workspace />;
});

export const Route = createFileRoute('/_authenticated/editor/resume/$resumeId')(
	{
		component: StandaloneResumeEditor,
	},
);
