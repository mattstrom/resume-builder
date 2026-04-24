import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { useFileManager } from '../../../components/FileManager';
import { RouteLoading } from '../../../components/RouteLoading.tsx';
import { GET_APPLICATION, LIST_RESUMES } from '../../../graphql/queries.ts';
import type {
	GetApplicationData,
	GetApplicationVariables,
	ListResumesData,
	ListResumesVariables,
} from '../../../graphql/types.ts';

export const Route = createFileRoute('/_authenticated/editor/$applicationId')({
	component: ApiApplicationEditor,
	loader: async ({ context, params }) => {
		const { applicationId } = params;
		const {
			store: { applicationStore, client, resumeStore },
		} = context;

		const applicationResult = await client.query<
			GetApplicationData,
			GetApplicationVariables
		>({
			query: GET_APPLICATION,
			variables: { id: applicationId },
		});
		const application = applicationResult.data.getApplication;

		applicationStore.selectApplication(applicationId);

		const resumesResult = await client.query<
			ListResumesData,
			ListResumesVariables
		>({
			query: LIST_RESUMES,
			variables: { filter: { applicationId } },
		});
		const resume = resumesResult.data.listResumes[0] ?? null;
		resumeStore.selectResume(resume?._id ?? null);

		return { application, resume };
	},
});

function ApiApplicationEditor() {
	const { applicationId } = Route.useParams();
	const {
		selectApiApplication,
		selectedApiApplicationId,
		isLoading,
		error,
		resumeData,
		selectedApplication,
	} = useFileManager();

	useEffect(() => {
		if (applicationId !== selectedApiApplicationId) {
			void selectApiApplication(applicationId);
		}
	}, [applicationId, selectedApiApplicationId, selectApiApplication]);

	useEffect(() => {
		if (selectedApplication && resumeData) {
			const name = resumeData.data.name;
			const company = selectedApplication.company;
			const titleParts = ['Application', name];
			if (company) {
				titleParts.push(company);
			}
			document.title = titleParts.join(' - ');
		}

		return () => {
			document.title = 'Resume Builder';
		};
	}, [resumeData, selectedApplication]);

	if (isLoading) {
		return <RouteLoading />;
	}

	if (error) {
		throw new Error(error);
	}

	return <Workspace />;
}
