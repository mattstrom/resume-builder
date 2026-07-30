/**
 * Regenerates the two O*NET-derived files.
 *
 *   node scripts/import-onet.mjs
 *
 *   src/vocabularies/technology-category.generated.ts
 *     152 categories — small enough to be a normal vocabulary with a Zod enum
 *     and a prompt rendering.
 *
 *   src/generated/technology-lexicon.ts
 *     ~8.8k product names. Far too many to be a vocabulary: the union type would
 *     wreck tsc and the enum would be useless in a prompt. It is a plain lookup
 *     table, used only to match free text.
 *
 * Source: O*NET 30.0 Database by USDOL/ETA, used under CC BY 4.0.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.onet-cache');

const ONET_RELEASE = '30_0';
const FILES = {
	technology: 'Technology Skills.txt',
};

/** O*NET category-code prefix -> authored top-level bucket. */
const BUCKETS = {
	432315: 'business-applications',
	432316: 'finance-and-accounting',
	432320: 'media-and-entertainment',
	432321: 'design-and-productivity',
	432322: 'content-management',
	432323: 'data-and-analytics',
	432324: 'software-development',
	432325: 'education-and-language',
	432326: 'industry-specific',
	432327: 'application-and-web-servers',
	432328: 'network-management',
	432329: 'networking',
	432330: 'operating-systems-and-storage',
	432332: 'security',
	432334: 'system-utilities',
	432335: 'communication-and-collaboration',
	432337: 'enterprise-management',
};

const BUCKET_LABELS = {
	'business-applications': 'Business Applications',
	'finance-and-accounting': 'Finance and Accounting',
	'media-and-entertainment': 'Media and Entertainment',
	'design-and-productivity': 'Design and Productivity',
	'content-management': 'Content Management',
	'data-and-analytics': 'Data and Analytics',
	'software-development': 'Software Development',
	'education-and-language': 'Education and Language',
	'industry-specific': 'Industry-Specific Systems',
	'application-and-web-servers': 'Application and Web Servers',
	'network-management': 'Network Management',
	networking: 'Networking',
	'operating-systems-and-storage': 'Operating Systems and Storage',
	security: 'Security',
	'system-utilities': 'System Utilities',
	'communication-and-collaboration': 'Communication and Collaboration',
	'enterprise-management': 'Enterprise Management',
};

function looseKey(label) {
	return label
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[\s_/\\]+/g, '-')
		.replace(/[^a-z0-9+#.-]/g, '')
		.replace(/-{2,}/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '');
}

function slugify(label) {
	return looseKey(label)
		.replace(/[.+#]/g, (char) => (char === '+' ? 'plus' : char === '#' ? 'sharp' : '-'))
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}

async function fetchFile(name) {
	await mkdir(CACHE, { recursive: true });

	const cached = join(CACHE, name);

	try {
		return await readFile(cached, 'utf8');
	} catch {
		// not cached yet
	}

	const url = `https://www.onetcenter.org/dl_files/database/db_${ONET_RELEASE}_text/${encodeURIComponent(name)}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to download ${name}: ${response.status} ${response.statusText}`);
	}

	const text = await response.text();

	await writeFile(cached, text, 'utf8');

	return text;
}

function parseTsv(text) {
	// O*NET ships CRLF. Left unhandled, the final column's header keeps a
	// trailing \r and every lookup against it silently returns undefined.
	const [header, ...rows] = text.replace(/\r\n/g, '\n').trim().split('\n');
	const columns = header.split('\t');

	return rows.map((row) => {
		const cells = row.split('\t');

		return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']));
	});
}

function quote(value) {
	return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const BANNER = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/import-onet.mjs
//
// Derived from the O*NET 30.0 Database by the U.S. Department of Labor,
// Employment and Training Administration (USDOL/ETA). Used under the
// CC BY 4.0 license. O*NET is a trademark of USDOL/ETA.
`;

async function main() {
	const rows = parseTsv(await fetchFile(FILES.technology));

	// ── Categories ────────────────────────────────────────────────────────────
	const categories = new Map();

	for (const row of rows) {
		const code = row['Commodity Code'];
		const title = row['Commodity Title'];

		if (!code || categories.has(code)) continue;

		const bucket = BUCKETS[code.slice(0, 6)];

		if (!bucket) {
			throw new Error(`No bucket mapped for commodity code ${code} (${title})`);
		}

		categories.set(code, { code, title, bucket, slug: slugify(title) });
	}

	const bySlug = new Map();

	for (const category of categories.values()) {
		if (bySlug.has(category.slug)) {
			throw new Error(`Duplicate category slug "${category.slug}" from "${category.title}"`);
		}

		bySlug.set(category.slug, category);
	}

	const categoryLines = [];

	for (const [slug, label] of Object.entries(BUCKET_LABELS)) {
		categoryLines.push(`\t\t${quote(slug)}: { label: ${quote(label)} },`);
	}

	for (const category of [...categories.values()].sort((a, b) => a.code.localeCompare(b.code))) {
		categoryLines.push(
			`\t\t${quote(category.slug)}: {`,
			`\t\t\tlabel: ${quote(category.title)},`,
			`\t\t\tparent: ${quote(category.bucket)},`,
			`\t\t},`,
		);
	}

	const categorySource = `${BANNER}
import { vocabulary } from '../core/vocabulary.js';

/**
 * What kind of software a technology is.
 *
 * The lower level comes from the categories O*NET assigns to each technology;
 * the 17 top-level buckets are authored, and are the level you actually want
 * when grouping a resume's skills section.
 */
export const technologyCategory = vocabulary(
	'technology-category',
	{
${categoryLines.join('\n')}
	},
	{
		title: 'Technology Category',
		description: 'Kind of software or platform.',
	},
);
`;

	await mkdir(join(ROOT, 'src/vocabularies'), { recursive: true });
	await writeFile(
		join(ROOT, 'src/vocabularies/technology-category.generated.ts'),
		categorySource,
	);

	// ── Lexicon ───────────────────────────────────────────────────────────────
	const technologies = new Map();

	for (const row of rows) {
		const name = row.Example?.trim();
		const code = row['Commodity Code'];

		if (!name || !code) continue;

		const category = categories.get(code);
		const existing = technologies.get(name);

		if (existing) {
			// A product can appear under several occupations and occasionally under
			// several commodity codes; keep the first category, union the flags.
			existing.hot ||= row['Hot Technology'] === 'Y';
			existing.inDemand ||= row['In Demand'] === 'Y';
			continue;
		}

		technologies.set(name, {
			name,
			category: category.slug,
			hot: row['Hot Technology'] === 'Y',
			inDemand: row['In Demand'] === 'Y',
		});
	}

	const entries = [...technologies.values()].sort((a, b) => a.name.localeCompare(b.name));
	const entryLines = entries.map(
		(entry) =>
			`\t[${quote(entry.name)}, ${quote(entry.category)}, ${entry.hot ? 1 : 0}, ${
				entry.inDemand ? 1 : 0
			}],`,
	);

	const lexiconSource = `${BANNER}
import type { TechnologyEntry } from '../core/lexicon.js';

/**
 * Every technology example O*NET publishes, as
 * \`[name, categorySlug, isHotTechnology, isInDemand]\`.
 *
 * \`hot\` marks technologies O*NET flags as frequently requested by employers;
 * \`inDemand\` marks those a broad range of employers ask for. Both are useful
 * as weak priors when ranking which technologies to surface on a resume.
 */
export const ONET_TECHNOLOGY_LEXICON: readonly TechnologyEntry[] = [
${entryLines.join('\n')}
];
`;

	await mkdir(join(ROOT, 'src/generated'), { recursive: true });
	await writeFile(join(ROOT, 'src/generated/technology-lexicon.ts'), lexiconSource);

	console.log(
		`technology-category: ${Object.keys(BUCKET_LABELS).length} buckets + ${categories.size} categories`,
	);
	console.log(`technology-lexicon:  ${entries.length} technologies`);
	console.log(`  hot:      ${entries.filter((entry) => entry.hot).length}`);
	console.log(`  inDemand: ${entries.filter((entry) => entry.inDemand).length}`);
}

await main();
