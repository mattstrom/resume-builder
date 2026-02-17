import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import puppeteer from 'puppeteer';

@Controller('pdf')
export class PdfController {
	@Get(':resumeId')
	async generatePdf(
		@Param('resumeId') resumeId: string,
		@Res() res: Response,
	) {
		const browser = await puppeteer.launch({ headless: true });

		try {
			const page = await browser.newPage();

			const url = `http://localhost:5173/preview/${resumeId}?template=basic&showMarginPattern=false`;
			await page.goto(url, { waitUntil: 'networkidle0' });

			// Wait for .page elements to render
			await page.waitForSelector('.page', { timeout: 10000 });

			const pdfBuffer = await page.pdf({
				format: 'letter',
				printBackground: true,
				margin: {
					top: '0in',
					right: '0in',
					bottom: '0in',
					left: '0in',
				},
			});

			res.set({
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="resume.pdf"`,
				'Content-Length': pdfBuffer.length,
			});

			res.end(pdfBuffer);
		} finally {
			await browser.close();
		}
	}
}
