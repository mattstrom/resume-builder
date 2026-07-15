import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InlineMarkdown } from './InlineMarkdown.tsx';

describe('InlineMarkdown', () => {
	it.each([
		['[Portfolio](https://example.com)', 'href="https://example.com"'],
		['[Email](mailto:person@example.com)', 'href="mailto:person@example.com"'],
		['[Call](tel:+15551234567)', 'href="tel:+15551234567"'],
		['[Projects](#projects)', 'href="#projects"'],
		[
			'[Resume Builder](#project-507f1f77bcf86cd799439011)',
			'href="#project-507f1f77bcf86cd799439011"',
		],
	])('renders an allowed link from %s', (value, expectedHref) => {
		const html = renderToStaticMarkup(<InlineMarkdown value={value} />);

		expect(html).toContain(expectedHref);
	});

	it('opens web links in a separate browser tab', () => {
		const html = renderToStaticMarkup(
			<InlineMarkdown value="[Portfolio](https://example.com)" />,
		);

		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('keeps ordinary and malformed Markdown as text', () => {
		expect(renderToStaticMarkup(<InlineMarkdown value="Plain text" />)).toBe('Plain text');
		expect(renderToStaticMarkup(<InlineMarkdown value="[Broken](" />)).toContain('[Broken](');
	});

	it('renders unsafe link labels without a clickable anchor', () => {
		const html = renderToStaticMarkup(<InlineMarkdown value="[Unsafe](javascript:alert(1))" />);

		expect(html).toContain('Unsafe');
		expect(html).not.toContain('<a');
		expect(html).not.toContain('javascript:');
	});

	it('does not render raw HTML from resume text', () => {
		const html = renderToStaticMarkup(
			<InlineMarkdown value={'Before <a href="https://example.com">raw</a> after'} />,
		);

		expect(html).toBe('Before raw after');
		expect(html).not.toContain('<a');
	});
});
