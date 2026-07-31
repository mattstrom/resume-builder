import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { BasicLayout, ColumnLayout } from '../../components/layouts';
import { GridLayout } from '../../components/layouts/GridLayout.tsx';
import { ResumeProvider } from '../../components/Resume.provider.tsx';
import { RouteError } from '../../components/RouteError.tsx';
import { RouteLoading } from '../../components/RouteLoading.tsx';
import { GET_RESUME, LIST_RESUMES } from '../../graphql/queries.ts';
import type {
	GetResumeData,
	GetResumeVariables,
	ListResumesData,
	ListResumesVariables,
} from '../../graphql/types.ts';
import { CrdtResumeController } from '../../lib/resume-document-controller.ts';

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
		const { client, authStore } = context.store;
		const { applicationId } = params;
		const { resumeId } = deps;

		try {
			// Prefer the resume currently open in the editor. Falling back to
			// "the application's first resume" silently shows the wrong resume
			// whenever an application has more than one linked.
			const resume = resumeId
				? (
						await client.query<GetResumeData, GetResumeVariables>({
							query: GET_RESUME,
							variables: { id: resumeId },
							fetchPolicy: 'network-only',
						})
					).data?.getResume
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

			// Postgres only holds a debounced mirror of the CRDT document, so
			// connect and read the authoritative live snapshot instead of
			// trusting the mirrored row.
			const token = await authStore.ensureToken();
			const controller = await CrdtResumeController.connect({
				resumeId: resume._id,
				resume,
				collaborationUrl: __CONFIG__.collaborationUrl,
				token,
			});

			try {
				return controller.getSnapshot() ?? resume;
			} finally {
				await controller.destroy();
			}
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

	// Render the selected template
	const templateComponent = (() => {
		switch (template) {
			case 'column':
				return <ColumnLayout />;
			case 'grid':
				return <GridLayout />;
			case 'basic':
			default:
				return <BasicLayout />;
		}
	})();

	// Apply margin pattern class if enabled
	const className = showMarginPattern ? 'show-margin-pattern' : '';

	return (
		<div className="preview-frame">
			<ResumeProvider data={resumeData}>
				<div className={className}>{templateComponent}</div>
			</ResumeProvider>
		</div>
	);
}
