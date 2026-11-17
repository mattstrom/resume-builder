import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { migrateResumeDocument } from './document-migrations.js';
import { getResumeContent, replaceResumeXml, serializeResumeXml } from './resume-xml-document.js';

const DEFAULT_ORDER = [
	'summary',
	'selected-experience',
	'work-experience',
	'education',
	'skills',
	'projects',
	'volunteer-experiences',
];

function legacyXml(extra = '') {
	return [
		'<resume xmlns="https://mattstrom.com/schemas/resume" schema-version="1" xml:id="n_r">',
		'<contact-info xml:id="a"><name xml:id="b">Alex</name></contact-info>',
		'<headline xml:id="c">Engineer</headline>',
		'<summary xml:id="d">Summary</summary>',
		'<education xml:id="e"></education>',
		'<work-experience xml:id="f">',
		'<job xml:id="job-1" company="Acme" title="Engineer">',
		'<responsibilities xml:id="k"><responsibility xml:id="l">Shipped</responsibility></responsibilities>',
		'</job>',
		'</work-experience>',
		extra,
		'<skills xml:id="g"></skills>',
		'<projects xml:id="h"></projects>',
		'<volunteer-experiences xml:id="i"></volunteer-experiences>',
		'</resume>',
	].join('');
}

function createDocument(xml: string) {
	const document = new Y.Doc();
	replaceResumeXml(document, xml);
	return document;
}

function sectionElements(xml: string) {
	return [...xml.matchAll(/<([a-z-]+) xml:id="[^"]*">/g)]
		.map((match) => match[1])
		.filter((name) => DEFAULT_ORDER.includes(name));
}

describe('migrateResumeDocument', () => {
	it('rewrites a legacy document into its rendered section order', () => {
		// Arrange
		const document = createDocument(legacyXml());

		// Act
		const migrated = migrateResumeDocument(document);
		const xml = serializeResumeXml(document);

		// Assert
		expect(migrated).toBe(true);
		expect(xml).toContain('section-order="document"');
		expect(sectionElements(xml)).toEqual(
			DEFAULT_ORDER.filter((key) => key !== 'selected-experience'),
		);
		expect(getResumeContent(document, 'user-1').sectionOrder).toEqual(DEFAULT_ORDER);
		expect(getResumeContent(document, 'user-1').workExperience[0]?.responsibilities).toEqual([
			{ _id: 'l', text: 'Shipped', bulletId: undefined },
		]);
	});

	it('keeps a legacy selected experience section after the section it follows', () => {
		// Arrange
		const document = createDocument(
			legacyXml('<selected-experience xml:id="j"></selected-experience>'),
		);

		// Act
		migrateResumeDocument(document);

		// Assert
		expect(getResumeContent(document, 'user-1').sectionOrder).toEqual([
			'summary',
			'work-experience',
			'selected-experience',
			'education',
			'skills',
			'projects',
			'volunteer-experiences',
		]);
	});

	it('does nothing to a document that has already been migrated', () => {
		// Arrange
		const document = createDocument(legacyXml());
		migrateResumeDocument(document);
		const before = serializeResumeXml(document);

		// Act
		const migratedAgain = migrateResumeDocument(document);

		// Assert
		expect(migratedAgain).toBe(false);
		expect(serializeResumeXml(document)).toBe(before);
	});

	it('preserves a custom order in a document that is already marked', () => {
		// Arrange
		const ordered = legacyXml()
			.replace('schema-version="1"', 'schema-version="1" section-order="document"')
			.replace('<skills xml:id="g"></skills>', '')
			.replace('<summary ', '<skills xml:id="g"></skills><summary ');
		const document = createDocument(ordered);

		// Act
		const migrated = migrateResumeDocument(document);

		// Assert
		expect(migrated).toBe(true);
		expect(serializeResumeXml(document)).toBe(ordered);
		expect(getResumeContent(document, 'user-1').sectionOrder?.[0]).toBe('skills');
	});

	it('ignores a document without resume XML', () => {
		// Arrange
		const document = new Y.Doc();

		// Act
		const migrated = migrateResumeDocument(document);

		// Assert
		expect(migrated).toBe(false);
	});
});
