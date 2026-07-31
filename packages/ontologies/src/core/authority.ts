import type { Authority, ExternalRef } from './types.js';

const BASE_URIS: Record<Authority, (id: string) => string> = {
	onet: (id) => {
		const [kind, ...rest] = id.split('/');
		const value = rest.join('/');

		// O*NET publishes occupations at a stable summary URL; technology examples
		// have no per-example URI, so they resolve to the tool search instead.
		return kind === 'soc'
			? `https://www.onetonline.org/link/summary/${value}`
			: `https://www.onetonline.org/search/tech/?s=${encodeURIComponent(value)}`;
	},
	unspsc: (id) => `https://www.unspsc.org/search-code?code=${id}`,
	soc: (id) => `https://www.bls.gov/soc/2018/major_groups.htm#${id}`,
	esco: (id) => `http://data.europa.eu/esco/${id}`,
	naics: (id) => `https://www.census.gov/naics/?input=${id}&year=2022`,
	wikidata: (id) => `https://www.wikidata.org/wiki/${id}`,
};

/** Split `esco:occupation/abc` into its authority and local identifier. */
export function parseRef(ref: ExternalRef): { authority: Authority; id: string } {
	const separator = ref.indexOf(':');
	const authority = ref.slice(0, separator) as Authority;

	return { authority, id: ref.slice(separator + 1) };
}

/** Expand a CURIE into a resolvable URI, for display and for RDF export. */
export function expandRef(ref: ExternalRef): string {
	const { authority, id } = parseRef(ref);
	const expand = BASE_URIS[authority];

	if (!expand) {
		throw new Error(`Unknown authority in external reference: ${ref}`);
	}

	return expand(id);
}

/** Filter a concept's mapping properties down to a single authority. */
export function refsFor(refs: readonly ExternalRef[], authority: Authority): ExternalRef[] {
	return refs.filter((ref) => parseRef(ref).authority === authority);
}
