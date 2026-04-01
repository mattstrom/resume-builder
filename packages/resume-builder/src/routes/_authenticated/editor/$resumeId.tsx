import type { Resume } from '@resume-builder/entities';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { useFileManager } from '../../../components/FileManager';
import { RouteLoading } from '../../../components/RouteLoading.tsx';
import { GET_RESUME } from '../../../graphql/queries.ts';

export const Route = createFileRoute('/_authenticated/editor/$resumeId')({
	component: ApiResumeEditor,
	loader: async ({ context, params }) => {
		const { resumeId } = params;
		const {
			store: { client, resumeStore },
		} = context;

		const result = await client.query<{ resume: Resume }>({
			query: GET_RESUME,
			variables: { id: resumeId },
		});

		resumeStore.selectResume(resumeId);

		return result.data?.resume;
	},
});

function ApiResumeEditor() {
	const { resumeId } = Route.useParams();
	const {
		selectApiResume,
		selectedApiResumeId,
		isLoading,
		error,
		resumeData,
	} = useFileManager();

	useEffect(() => {
		// Only load if the URL resumeId doesn't match current selection
		if (resumeId !== selectedApiResumeId) {
			selectApiResume(resumeId);
		}
	}, [resumeId, selectedApiResumeId, selectApiResume]);

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

	if (isLoading) {
		return <RouteLoading />;
	}

	if (error) {
		throw new Error(error);
	}

	return <Workspace />;
}
