function decodeXmlAttribute(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#10;|&#xA;/gi, '\n')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

function jobBlockToNarrativeText(attributes: string): string {
	const values = Object.fromEntries(
		Array.from(attributes.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g), ([, key, value]) => [
			key,
			decodeXmlAttribute(value),
		]),
	);
	const fields = [
		['Position', values.position],
		['Company', values.company],
		['Location', values.location],
		['Start Date', values.startDate],
		['End Date', values.endDate],
	]
		.filter(([, value]) => value)
		.map(([label, value]) => `${label}: ${value}`);
	const narrative = values.narrative?.trim();

	return ['Job:', ...fields, ...(narrative ? ['Narrative:', narrative] : [])].join(
		'\n',
	);
}

export function stripXmlTags(xml: string): string {
	return xml
		.replace(/<jobBlock\b([^>]*)>(?:<\/jobBlock>)?/g, (_, attributes: string) =>
			jobBlockToNarrativeText(attributes),
		)
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}
