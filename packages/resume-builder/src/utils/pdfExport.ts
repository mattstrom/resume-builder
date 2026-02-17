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
	const html = doc.documentElement.outerHTML;

	const response = await fetch('/api/pdf', {
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

/**
 * Generates a PDF from a pre-captured HTML string and triggers download.
 */
export async function generatePDFFromHTML(
	html: string,
	resumeData: ResumeData,
): Promise<void> {
	const response = await fetch('/api/pdf', {
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
	const iframe = document.getElementById(
		'resume-preview-iframe',
	) as HTMLIFrameElement | null;

	if (!iframe?.contentDocument) {
		throw new Error(
			'Preview not available. Please wait for preview to load.',
		);
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
