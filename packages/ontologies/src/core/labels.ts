/**
 * Label folding for synonym matching.
 *
 * Two tiers, tried in order, so that authored synonym lists stay short:
 *
 *   loose  'CI/CD'    -> 'ci-cd'     separators unified, punctuation kept
 *   tight  'React.js' -> 'reactjs'   all punctuation dropped except + and #
 *
 * The tight tier is what makes `React.js`, `ReactJS`, and `React JS` all
 * collapse onto `react` without anyone listing them. `+` and `#` survive both
 * tiers because dropping them would merge `C`, `C++`, and `C#`.
 */

const DIACRITICS = /[̀-ͯ]/g;
const SEPARATORS = /[\s_/\\]+/g;
const LOOSE_DISALLOWED = /[^a-z0-9+#.-]/g;
const TIGHT_DISALLOWED = /[^a-z0-9+#]/g;
const REPEATED_DASH = /-{2,}/g;

function base(label: string): string {
	return label.normalize('NFKD').replace(DIACRITICS, '').toLowerCase().trim();
}

/** Separator-insensitive form: `CI/CD` and `CI CD` both become `ci-cd`. */
export function looseKey(label: string): string {
	return base(label)
		.replace(SEPARATORS, '-')
		.replace(LOOSE_DISALLOWED, '')
		.replace(REPEATED_DASH, '-')
		.replace(/^[-.]+|[-.]+$/g, '');
}

/** Punctuation-insensitive form: `Node.js`, `node-js`, and `NodeJS` all become `nodejs`. */
export function tightKey(label: string): string {
	return base(label).replace(TIGHT_DISALLOWED, '');
}
