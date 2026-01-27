import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ResumeProvider } from '../components/Resume.provider.tsx';
import { BasicLayout, ColumnLayout } from '../components/layouts';
import { GridLayout } from '../components/layouts/GridLayout.tsx';
import { RouteError } from '../components/RouteError.tsx';
import { RouteLoading } from '../components/RouteLoading.tsx';

// Import CSS for proper styling
import '../App.css';

const previewSearchSchema = z
	.object({
		template: z
			.enum(['basic', 'column', 'grid'])
			.optional()
			.default('basic'),
		showMarginPattern: z.coerce.boolean().optional().default(true),
	})
	.catch({
		template: 'basic',
		showMarginPattern: true,
	});

export const Route = createFileRoute('/preview/$resumeId')({
	validateSearch: previewSearchSchema,

	loader: async ({ context, params }) => {
		const { resumeStore } = context.store;
		const { resumeId } = params;

		try {
			const { data: result } = await resumeStore.refetch();

			if (!result) {
				throw new Error('Resume not found');
			}

			const resumes = result.listResumes;
			const resume = resumes.find((resume) => resume._id === resumeId);

			if (!resume) {
				throw new Error('Resume not found');
			}

			return resume;
		} catch (error) {
			// Handle GraphQL errors that indicate resume not found
			if (
				error instanceof Error &&
				(error.message?.includes('NotFoundException') ||
					error.message?.includes('not found'))
			) {
				throw new Error('Resume not found (404)');
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
