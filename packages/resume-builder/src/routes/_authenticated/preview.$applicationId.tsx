import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ResumePreviewDocument } from '../../components/ResumePreviewDocument.tsx';
import { RouteError } from '../../components/RouteError.tsx';
import { RouteLoading } from '../../components/RouteLoading.tsx';
import { LIST_RESUMES } from '../../graphql/queries.ts';
import type {
	ListResumesData,
	ListResumesVariables,
} from '../../graphql/types.ts';
import { loadLiveResume } from '../../lib/load-live-resume.ts';

// Import CSS for proper styling
import '../../App.css';

const previewSearchSchema = z
	.object({
		template: z.enum(['basic', 'column', 'grid']).optional().default('basic'),
		showMarginPattern: z.coerce.boolean().optional().default(true),
		resumeId: z.string().optional(),
	})
	.catch({
		template: 'basic',
		showMarginPattern: true,
	});

export const Route = createFileRoute('/_authenticated/preview/$applicationId')({
	validateSearch: previewSearchSchema,

	loaderDeps: ({ search }) => ({ resumeId: search.resumeId }),

	loader: async ({ context, params, deps }) => {
		const { client } = context.store;
		const { applicationId } = params;
		const { resumeId } = deps;

		try {
			// Prefer the resume currently open in the editor. Falling back to
			// "the application's first resume" silently shows the wrong resume
			// whenever an application has more than one linked.
			const resume = resumeId
				? { _id: resumeId }
				: (
						await client.query<ListResumesData, ListResumesVariables>({
							query: LIST_RESUMES,
							variables: { filter: { applicationId } },
							fetchPolicy: 'network-only',
						})
					).data?.listResumes[0];

			if (!resume) {
				throw new Error('Application has no linked resume');
			}

			return loadLiveResume(context.store, resume._id);
		} catch (error) {
			if (
				error instanceof Error &&
				(error.message?.includes('NotFoundException') ||
					error.message?.includes('not found'))
			) {
				throw new Error('Linked resume not found (404)');
			}
			throw error;
		}
	},

	component: PreviewComponent,
	errorComponent: RouteError,
	pendingComponent: RouteLoading,
});

function PreviewComponent() {
	const { template, showMarginPattern } = Route.useSearch();
	const resumeData = Route.useLoaderData();

	return (
		<ResumePreviewDocument
			resume={resumeData}
			template={template}
			showMarginPattern={showMarginPattern}
		/>
	);
}
