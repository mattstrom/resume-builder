import { authFetch } from './auth';

interface ResumeData {
	name?: string;
	company?: string;
}

/**
 * Generates a PDF via the backend Puppeteer endpoint and triggers download.
 * Captures the rendered HTML and sends it to the backend for PDF generation.
 * @param resumeData Resume data containing name and company for filename
 * @param sourceDocument Document to capture HTML from. Defaults to
 *   the preview iframe's contentDocument when omitted.
 * @throws Error if the PDF generation request fails
 */
export async function generatePDF(
	resumeData: ResumeData,
	sourceDocument?: Document,
): Promise<void> {
	const doc = sourceDocument ?? getPreviewDocument();
	await waitForPaginationReady(doc);
	const html = doc.documentElement.outerHTML;

	const response = await authFetch('/api/pdf', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ html }),
	});

	if (!response.ok) {
		throw new Error('Failed to generate PDF. Please try again.');
	}

	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const filename = generateFilename(resumeData);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/** Wait until a measured Basic layout has committed its page breaks. */
export async function waitForPaginationReady(doc: Document): Promise<void> {
	const paginatedDocument = doc.querySelector<HTMLElement>('[data-pagination-ready]');

	if (!paginatedDocument || paginatedDocument.dataset.paginationReady === 'true') {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const timeout = window.setTimeout(() => {
			observer.disconnect();
			reject(new Error('Resume pagination did not finish in time.'));
		}, 10000);
		const observer = new MutationObserver(() => {
			if (paginatedDocument.dataset.paginationReady !== 'true') return;
			window.clearTimeout(timeout);
			observer.disconnect();
			resolve();
		});

		observer.observe(paginatedDocument, {
			attributes: true,
			attributeFilter: ['data-pagination-ready'],
		});
	});
}

/**
 * Generates a PDF from a pre-captured HTML string and triggers download.
 */
export async function generatePDFFromHTML(html: string, resumeData: ResumeData): Promise<void> {
	const response = await authFetch('/api/pdf', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ html }),
	});

	if (!response.ok) {
		throw new Error('Failed to generate PDF. Please try again.');
	}

	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const filename = generateFilename(resumeData);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function getPreviewDocument(): Document {
	const iframe = document.getElementById('resume-preview-iframe') as HTMLIFrameElement | null;

	if (!iframe?.contentDocument) {
		throw new Error('Preview not available. Please wait for preview to load.');
	}

	return iframe.contentDocument;
}

/**
 * Generates a filename from resume data
 * Pattern: "{name} - {company}.pdf" with fallbacks
 */
function generateFilename(resumeData: ResumeData): string {
	const { name, company } = resumeData;

	if (name && company) {
		return `${name} - ${company}.pdf`;
	}

	if (name) {
		return `${name} Resume.pdf`;
	}

	return 'Resume.pdf';
}
