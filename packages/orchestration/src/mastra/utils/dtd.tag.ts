import { outdent } from 'outdent';

/**
 * Tagged template literal for DTDs
 */
export function dtd(strings: TemplateStringsArray, ...values: any[]): string {
	return outdent(strings, ...values);
}
