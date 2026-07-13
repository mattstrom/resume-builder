import * as Y from 'yjs';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeXml(value: string): string {
	return value.replace(/[&<>'"]/g, (character) => {
		switch (character) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case "'":
				return '&apos;';
			case '"':
				return '&quot;';
			default:
				return character;
		}
	});
}

function serializeXmlAttributes(attributes: Record<string, unknown>): string {
	return Object.entries(attributes)
		.map(([name, value]) => ` ${name}="${escapeXml(String(value))}"`)
		.join('');
}

function serializeXmlText(text: Y.XmlText): string {
	const delta = text.toDelta() as Array<{
		insert: string;
		attributes?: Record<string, unknown>;
	}>;

	return delta
		.map(({ insert, attributes }) =>
			Object.entries(attributes ?? {}).reduce(
				(content, [markName, markAttributes]) =>
					`<${markName}${isPlainObject(markAttributes) ? serializeXmlAttributes(markAttributes) : ''}>${content}</${markName}>`,
				escapeXml(insert),
			),
		)
		.join('');
}

function serializeXmlElement(element: Y.XmlElement): string {
	const content = element
		.toArray()
		.map((child) => {
			if (child instanceof Y.XmlElement) {
				return serializeXmlElement(child);
			}

			if (child instanceof Y.XmlText) {
				return serializeXmlText(child);
			}

			return '';
		})
		.join('');
	const nodeName = element.nodeName;

	return `<${nodeName}${serializeXmlAttributes(element.getAttributes())}>${content}</${nodeName}>`;
}

function serializeXmlFragment(fragment: Y.XmlFragment): string {
	return fragment
		.toArray()
		.map((child) => (child instanceof Y.XmlElement ? serializeXmlElement(child) : ''))
		.join('');
}

/**
 * Mirrors how `packages/crdt`'s Hocuspocus storage extension reads a
 * document (`packages/crdt/src/modules/storage/storage.service.ts`): resume
 * documents keep their data in a `resume` map, profile documents split it
 * across a `narrative` XmlFragment and a `jobPreferences` map. Falls back to
 * the `resume` map shape for any other/unrecognized document name.
 */
export function materializeDocument(ydoc: Y.Doc, documentName: string): unknown {
	if (documentName.startsWith('profile:')) {
		return {
			narrative: serializeXmlFragment(ydoc.getXmlFragment('narrative')),
			jobPreferences: ydoc.getMap('jobPreferences').toJSON(),
		};
	}

	return ydoc.getMap('resume').toJSON();
}
