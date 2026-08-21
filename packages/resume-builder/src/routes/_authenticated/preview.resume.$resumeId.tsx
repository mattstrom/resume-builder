import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ResumePreviewDocument } from '@/components/ResumePreviewDocument.tsx';
import { RouteError } from '@/components/RouteError.tsx';
import { RouteLoading } from '@/components/RouteLoading.tsx';
import { loadLiveResume } from '@/lib/load-live-resume.ts';

import '../../App.css';

const previewSearchSchema = z
	.object({
		template: z.enum(['basic', 'column', 'grid']).optional().default('basic'),
		showMarginPattern: z.coerce.boolean().optional().default(true),
	})
	.catch({ template: 'basic', showMarginPattern: true });

export const Route = createFileRoute(
	'/_authenticated/preview/resume/$resumeId',
)({
	validateSearch: previewSearchSchema,
	loader: ({ context, params }) =>
		loadLiveResume(context.store, params.resumeId),
	component: StandaloneResumePreview,
	errorComponent: RouteError,
	pendingComponent: RouteLoading,
});

function StandaloneResumePreview() {
	const resume = Route.useLoaderData();
	const { template, showMarginPattern } = Route.useSearch();
	return (
		<ResumePreviewDocument
			resume={resume}
			template={template}
			showMarginPattern={showMarginPattern}
		/>
	);
}
