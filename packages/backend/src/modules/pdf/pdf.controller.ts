import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import puppeteer from 'puppeteer';

@Controller('pdf')
export class PdfController {
	@Post()
	async generatePdf(
		@Body('html') html: string,
		@Res() res: Response,
	) {
		const browser = await puppeteer.launch({ headless: true });

		try {
			const page = await browser.newPage();

			await page.setContent(html, { waitUntil: 'networkidle0' });
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
				'Content-Disposition': 'attachment; filename="resume.pdf"',
				'Content-Length': pdfBuffer.length,
			});

			res.end(pdfBuffer);
		} finally {
			await browser.close();
		}
	}
}
