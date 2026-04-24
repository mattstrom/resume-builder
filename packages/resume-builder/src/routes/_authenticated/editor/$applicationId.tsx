import { createFileRoute } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { Workspace } from '../../../components/Workspace.tsx';
import { RouteLoading } from '../../../components/RouteLoading.tsx';
import { GET_APPLICATION } from '../../../graphql/queries.ts';
import type {
	GetApplicationData,
	GetApplicationVariables,
} from '../../../graphql/types.ts';
import { useStore } from '../../../stores/store.provider.tsx';

const ApiApplicationEditor = observer(function ApiApplicationEditor() {
	const { applicationId } = Route.useParams();
	const { editorStore } = useStore();
	const {
		selectedApiApplicationId,
		isLoading,
		error,
		resumeData,
		selectedApplication,
	} = editorStore;

	useEffect(() => {
		if (applicationId !== selectedApiApplicationId) {
			void editorStore.selectApplication(applicationId);
		}
	}, [applicationId, selectedApiApplicationId, editorStore]);

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
});

export const Route = createFileRoute('/_authenticated/editor/$applicationId')({
	component: ApiApplicationEditor,
	loader: async ({ context, params }) => {
		const { applicationId } = params;
		const {
			store: { applicationStore, client },
		} = context;

		const applicationResult = await client.query<
			GetApplicationData,
			GetApplicationVariables
		>({
			query: GET_APPLICATION,
			variables: { id: applicationId },
		});
		const application = applicationResult.data?.getApplication;

		applicationStore.selectApplication(applicationId);

		return { application };
	},
});
