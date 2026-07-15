import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
	formatWebUrl,
	getResumeLinkClickAction,
	normalizeWebUrl,
	ResumeLink,
	sanitizeResumeHref,
} from './ResumeLink.tsx';

describe('resume links', () => {
	it.each([
		'https://example.com',
		'http://example.com',
		'mailto:person@example.com',
		'tel:+15551234567',
		'#projects',
	])('allows %s', (href) => {
		expect(sanitizeResumeHref(href)).toBe(href);
	});

	it.each(['javascript:alert(1)', 'data:text/html,test', '/relative', '#bad target'])(
		'rejects %s',
		(href) => {
			expect(sanitizeResumeHref(href)).toBeNull();
		},
	);

	it('normalizes website fields and formats their labels', () => {
		expect(normalizeWebUrl('example.com/portfolio')).toBe('https://example.com/portfolio');
		expect(formatWebUrl('https://example.com/')).toBe('example.com');
	});

	it('edits on an ordinary editable click and follows modifier clicks', () => {
		expect(getResumeLinkClickAction(true, { ctrlKey: false, metaKey: false })).toBe('edit');
		expect(getResumeLinkClickAction(true, { ctrlKey: true, metaKey: false })).toBe('follow');
		expect(getResumeLinkClickAction(true, { ctrlKey: false, metaKey: true })).toBe('follow');
		expect(getResumeLinkClickAction(false, { ctrlKey: false, metaKey: false })).toBe('follow');
	});

	it('inherits the surrounding text color for internal links', () => {
		const internal = renderToStaticMarkup(<ResumeLink href="#projects">Projects</ResumeLink>);
		const external = renderToStaticMarkup(
			<ResumeLink href="https://example.com">Portfolio</ResumeLink>,
		);

		expect(internal).toContain('style="color:inherit"');
		expect(external).not.toContain('style="color:inherit"');
	});
});
