import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import puppeteer from 'puppeteer';

@Controller('pdf')
export class PdfController {
	@Post()
	async generatePdf(@Body('html') html: string, @Res() res: Response) {
		const browser = await puppeteer.launch({
			headless: true,
			args: process.env.PUPPETEER_DISABLE_SANDBOX === 'true' ? ['--no-sandbox'] : [],
		});

		try {
			const page = await browser.newPage();

			// Load the fonts used by print rules before producing the PDF.
			await page.emulateMediaType('print');
			await page.setContent(html, { waitUntil: 'networkidle0' });
			await page.waitForSelector('.page, [data-pagination-ready="true"]', {
				timeout: 10000,
			});
			await page.evaluate(() => document.fonts.ready.then(() => undefined));

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
