function decodeXmlAttribute(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#10;|&#xA;/gi, '\n')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

function xmlText(value: string): string {
	return decodeXmlAttribute(value.replace(/<[^>]+>/g, ' '))
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function jobBlockToNarrativeText(content: string): string {
	const values = Object.fromEntries(
		Array.from(
			content.matchAll(
				/<jobField\b[^>]*\bfield="([^"]+)"[^>]*>([\s\S]*?)<\/jobField>/gi,
			),
			([, field, value]) => [field, xmlText(value)],
		),
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
	const narrative =
		xmlText(
			content.match(
				/<jobNarrative\b[^>]*>([\s\S]*?)<\/jobNarrative>/i,
			)?.[1] ?? '',
		) ||
		values.narrative?.trim() ||
		'';

	return [
		'Job:',
		...fields,
		...(narrative ? ['Narrative:', narrative] : []),
	].join('\n');
}

export function stripXmlTags(xml: string): string {
	return xml
		.replace(
			/<jobBlock\b[^>]*>([\s\S]*?)<\/jobBlock>/gi,
			(_, content: string) => jobBlockToNarrativeText(content),
		)
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}
