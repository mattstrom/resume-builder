// Run through `nx run resume-builder:test-pdf-fonts` (builds production assets).
// Set PDF_CHROMIUM_PATH=/usr/bin/chromium in the backend browser-runtime image
// and PUPPETEER_DISABLE_SANDBOX=true when that container requires it.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import ts from 'typescript';

const webRoot = new URL('../packages/resume-builder/', import.meta.url);
const dist = new URL('dist/', webRoot);
const index = await fs.readFile(new URL('index.html', dist), 'utf8');
const stylesheets = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(
	([link]) => link.match(/href="([^"]+)"/)[1],
);
assert.ok(stylesheets.length, 'Build the frontend before checking PDF fonts');
const capture = ts.transpileModule(
	await fs.readFile(new URL('src/utils/pdfDocument.ts', webRoot), 'utf8'),
	{ compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;

const browser = await chromium.launch({
	executablePath: process.env.PDF_CHROMIUM_PATH,
	args: process.env.PUPPETEER_DISABLE_SANDBOX === 'true' ? ['--no-sandbox'] : [],
});

try {
	for (const template of ['basic', 'column', 'grid']) {
		// Arrange: actual production CSS, with no font-family override on probes.
		const preview = await browser.newPage();
		await preview.route('https://pdf.test/**', async (route) => {
			const pathname = new URL(route.request().url()).pathname;
			if (pathname.startsWith('/assets/')) {
				await route.fulfill({ path: fileURLToPath(new URL(`.${pathname}`, dist)) });
				return;
			}
			await route.fulfill({
				contentType: 'text/html',
				body: `<!doctype html><html><head>${stylesheets
					.map((href) => `<link rel="stylesheet" href="${href}">`)
					.join('')}</head><body>
					<div class="layout ${template}"><div class="page">
						<div class="page-content"><header class="masthead">
							<h1 id="heading" class="candidate-name">Matt Strom</h1>
						</header><section class="section major">
							<header><h2>Professional summary</h2></header>
							<p id="body">Full-stack software engineer with 15+ years of experience.</p>
							<h3 id="bold">Staff Software Engineer</h3>
						</section></div></div></div></body></html>`,
			});
		});
		await preview.goto('https://pdf.test/preview');
		await preview.evaluate(() => document.fonts.ready.then(() => undefined));
		await preview.addScriptTag({
			content: `{
			const exports = {}; ${capture}
			window.capturePdfHtml = exports.capturePdfHtml;
		}`,
		});

		// Act: capture the screen preview and render it offline with print media.
		const html = await preview.evaluate(() => window.capturePdfHtml(document));
		const pdfPage = await browser.newPage();
		const externalRequests = [];
		await pdfPage.route('**/*', (route) => {
			externalRequests.push(route.request().url());
			return route.abort();
		});
		await pdfPage.emulateMedia({ media: 'print' });
		await pdfPage.setContent(html, { waitUntil: 'networkidle' });
		await pdfPage.evaluate(() => document.fonts.ready.then(() => undefined));

		// Assert the actual rendered fonts, rather than just computed font-family:
		// a valid CSS font stack can still resolve to Liberation Mono on Linux.
		for (const page of [preview, pdfPage]) {
			const cdp = await page.context().newCDPSession(page);
			await cdp.send('DOM.enable');
			await cdp.send('CSS.enable');
			const { root } = await cdp.send('DOM.getDocument');
			for (const selector of ['#body', '#bold', '#heading']) {
				const { nodeId } = await cdp.send('DOM.querySelector', {
					nodeId: root.nodeId,
					selector,
				});
				const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
				const expected =
					template === 'column' && selector === '#heading'
						? /^Roboto Serif(?: 20pt)?$/
						: /^Roboto$/;
				assert.ok(fonts.length, `${template} ${selector} must render text`);
				for (const font of fonts) {
					assert.match(font.familyName, expected, `${template} ${selector}`);
					assert.equal(font.isCustomFont, true, 'Use an embedded web font');
					if (selector === '#bold') assert.match(font.postScriptName, /Bold/);
				}
			}
			await cdp.detach();
		}
		assert.deepEqual(externalRequests, [], 'PDF fonts must work offline');
		const pdf = await pdfPage.pdf({ format: 'letter', printBackground: true });
		assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
		console.log(
			`${template}: embedded regular, bold and heading fonts verified in preview and PDF`,
		);
		await preview.close();
		await pdfPage.close();
	}
} finally {
	await browser.close();
}
