import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ResumeData {
  name?: string;
  company?: string;
}

/**
 * Generates a PDF from the resume preview iframe and triggers download
 * @param resumeData Resume data containing name and company for filename
 * @throws Error if preview is not loaded or rendering fails
 */
export async function generatePDF(resumeData: ResumeData): Promise<void> {
  // Get the preview iframe
  const iframe = document.getElementById(
    'resume-preview-iframe'
  ) as HTMLIFrameElement | null;

  if (!iframe?.contentDocument) {
    throw new Error('Preview not available. Please wait for preview to load.');
  }

  // Get all page elements from the iframe
  const pages = iframe.contentDocument.querySelectorAll('.page');

  if (!pages || pages.length === 0) {
    throw new Error('No resume content found in preview.');
  }

  try {
    // Initialize PDF with letter size (8.5" x 11")
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // Render page to canvas with 2x scale for quality
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Add new page if not the first
      if (i > 0) {
        pdf.addPage();
      }

      // Add image to PDF (letter size: 8.5" x 11")
      const imgWidth = 8.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    // Generate filename from resume data
    const filename = generateFilename(resumeData);

    // Trigger download
    pdf.save(filename);
  } catch (error) {
    throw new Error('Failed to render resume. Please try again.');
  }
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
