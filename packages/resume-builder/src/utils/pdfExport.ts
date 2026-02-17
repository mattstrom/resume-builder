interface ResumeData {
	name?: string;
	company?: string;
}

/**
 * Generates a PDF via the backend Puppeteer endpoint and triggers download
 * @param resumeId The resume ID to export
 * @param resumeData Resume data containing name and company for filename
 * @throws Error if the PDF generation request fails
 */
export async function generatePDF(
	resumeId: string,
	resumeData: ResumeData,
): Promise<void> {
	const response = await fetch(`http://localhost:3000/pdf/${resumeId}`);

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
