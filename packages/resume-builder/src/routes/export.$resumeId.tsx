import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { ResumeProvider } from '../components/Resume.provider.tsx';
import { BasicLayout, ColumnLayout } from '../components/layouts';
import { GridLayout } from '../components/layouts/GridLayout.tsx';
import { RouteError } from '../components/RouteError.tsx';
import { RouteLoading } from '../components/RouteLoading.tsx';
import { generatePDFFromHTML } from '../utils/pdfExport';

import '../App.css';

const exportSearchSchema = z
	.object({
		template: z
			.enum(['basic', 'column', 'grid'])
			.optional()
			.default('basic'),
	})
	.catch({ template: 'basic' });

export const Route = createFileRoute('/export/$resumeId')({
	validateSearch: exportSearchSchema,

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

	component: ExportComponent,
	errorComponent: RouteError,
	pendingComponent: RouteLoading,
});

function ExportComponent() {
	const { template } = Route.useSearch();
	const resumeData = Route.useLoaderData();
	const hasExported = useRef(false);
	const [status, setStatus] = useState<'exporting' | 'done' | 'error'>(
		'exporting',
	);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		if (hasExported.current) return;
		hasExported.current = true;

		// Defer to next frame so the resume content renders first,
		// then snapshot the HTML before the overlay can interfere.
		requestAnimationFrame(() => {
			const clone = document.documentElement.cloneNode(
				true,
			) as HTMLElement;
			// Remove the overlay from the cloned document
			const overlay = clone.querySelector('[data-export-overlay]');
			overlay?.remove();

			const html = `<!DOCTYPE html>${clone.outerHTML}`;

			generatePDFFromHTML(html, resumeData)
				.then(() => setStatus('done'))
				.catch((err) => {
					setErrorMessage(
						err instanceof Error
							? err.message
							: 'Failed to export PDF',
					);
					setStatus('error');
				});
		});
	}, [resumeData]);

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

	return (
		<div className="preview-frame">
			<ResumeProvider data={resumeData}>
				{templateComponent}
			</ResumeProvider>

			<div
				data-export-overlay
				style={{
					position: 'fixed',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: 'rgba(0, 0, 0, 0.75)',
					zIndex: 100,
				}}
			>
				<div
					style={{
						color: 'white',
						textAlign: 'center',
						padding: '2rem',
					}}
				>
					{status === 'exporting' && (
						<>
							<p
								style={{
									fontSize: '1.25rem',
									marginBottom: '0.5rem',
								}}
							>
								Generating PDF…
							</p>
							<p style={{ opacity: 0.6, fontSize: '0.875rem' }}>
								Please wait
							</p>
						</>
					)}
					{status === 'done' && (
						<p style={{ fontSize: '1.25rem' }}>
							PDF downloaded successfully!
						</p>
					)}
					{status === 'error' && (
						<>
							<p
								style={{
									fontSize: '1.25rem',
									color: '#f87171',
								}}
							>
								Export failed
							</p>
							<p style={{ opacity: 0.6, fontSize: '0.875rem' }}>
								{errorMessage}
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
