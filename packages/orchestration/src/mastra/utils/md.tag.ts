import { outdent } from 'outdent';

/**
 * Tagged template literal for Markdown content
 */
export function md(strings: TemplateStringsArray, ...values: any[]): string {
	return outdent(strings, ...values);
}
