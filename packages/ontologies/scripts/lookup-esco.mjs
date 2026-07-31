/**
 * Interactive helper for authoring ESCO alignments.
 *
 *   node scripts/lookup-esco.mjs occupation "software architect" "data engineer"
 *   node scripts/lookup-esco.mjs skill "software architecture"
 *
 * Prints candidate ESCO concepts as ready-to-paste CURIEs. Exact title matches
 * are marked `EXACT` and are safe to use as `exactMatch`; anything else needs a
 * human decision between `closeMatch`, `broadMatch`, or nothing at all.
 *
 * This is an authoring aid, not part of the build — ESCO alignments are checked
 * into the scheme sources so the package never needs network access.
 */

const [type, ...terms] = process.argv.slice(2);

if (!type || terms.length === 0) {
	console.error('usage: node scripts/lookup-esco.mjs <occupation|skill> <term>...');
	process.exit(1);
}

const ENDPOINT = 'https://ec.europa.eu/esco/api/search';

for (const term of terms) {
	const url = `${ENDPOINT}?text=${encodeURIComponent(term)}&language=en&type=${type}&limit=4`;

	let payload;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			console.log(`${term}\n  ERROR ${response.status}`);
			continue;
		}

		payload = await response.json();
	} catch (error) {
		console.log(`${term}\n  ERROR ${error.message}`);
		continue;
	}

	const results = payload?._embedded?.results ?? [];

	console.log(`${term}  (${payload.total} hits)`);

	if (results.length === 0) {
		console.log('  NONE');
	}

	for (const result of results) {
		const uri = result.uri ?? '';
		const local = uri.replace('http://data.europa.eu/esco/', '');
		const title = result.title ?? result.preferredLabel ?? '?';
		const exact = title.toLowerCase() === term.toLowerCase() ? 'EXACT' : '     ';

		console.log(`  ${exact} ${title}\n          'esco:${local}',`);
	}

	// ESCO's public API is unauthenticated and rate limited; be polite.
	await new Promise((resolve) => setTimeout(resolve, 150));
}
