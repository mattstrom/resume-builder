import {
	isResumeSectionKey,
	RESUME_XML_FRAGMENT,
	RESUME_XML_SECTION_ORDER_ATTRIBUTE,
	RESUME_XML_SECTION_ORDER_DOCUMENT,
	resumeContentFromXml,
	validateResumeXml,
} from '@resume-builder/entities';
import * as Y from 'yjs';

import { parseXmlElement, serializeXmlElement } from './resume-xml-document.js';

type ProfileDocumentMigration = {
	id: string;
	migrate: (document: Y.Doc) => void;
};

function isXmlElement(value: unknown): value is Y.XmlElement {
	return value instanceof Y.XmlElement;
}

function createJobTechnologies(): Y.XmlElement {
	return new Y.XmlElement('jobTechnologies');
}

/**
 * Backfill the structured Technologies section for legacy job blocks. The
 * migration is deliberately structural: it only inserts the missing node and
 * never infers technologies from prose.
 */
function addJobTechnologies(document: Y.Doc) {
	const fragment = document.getXmlFragment('narrative');

	const visit = (container: Y.XmlFragment | Y.XmlElement) => {
		for (const child of container.toArray()) {
			if (!isXmlElement(child)) continue;

			if (child.nodeName === 'jobBlock') {
				const children = child.toArray();
				const hasTechnologies = children.some(
					(entry) =>
						isXmlElement(entry) &&
						entry.nodeName === 'jobTechnologies',
				);
				const narrativeIndex = children.findIndex(
					(entry) =>
						isXmlElement(entry) &&
						entry.nodeName === 'jobNarrative',
				);
				const dateRangeIndex = children.findIndex(
					(entry) =>
						isXmlElement(entry) &&
						entry.nodeName === 'jobDateRange',
				);

				if (!hasTechnologies) {
					child.insert(
						narrativeIndex >= 0
							? narrativeIndex
							: dateRangeIndex >= 0
								? dateRangeIndex + 1
								: children.length,
						[createJobTechnologies()],
					);
				}
			}

			visit(child);
		}
	};

	visit(fragment);
}

/**
 * Replace the paragraph-based technology entries with semantic skill marks.
 * Tiptap stores marks as XML text formatting, which serializes to a direct
 * <skill> entry for each technology inside the Technologies section.
 */
function convertJobTechnologyParagraphsToSkills(document: Y.Doc) {
	const fragment = document.getXmlFragment('narrative');

	const visit = (container: Y.XmlFragment | Y.XmlElement) => {
		for (const child of container.toArray()) {
			if (!isXmlElement(child)) continue;

			if (child.nodeName === 'jobTechnologies') {
				const paragraphs = child
					.toArray()
					.filter(
						(entry): entry is Y.XmlElement =>
							isXmlElement(entry) &&
							entry.nodeName === 'paragraph',
					);

				if (paragraphs.length > 0) {
					const technologies = paragraphs
						.map((paragraph) =>
							paragraph
								.toArray()
								.filter(
									(entry): entry is Y.XmlText =>
										entry instanceof Y.XmlText,
								)
								.map((text) => text.toString())
								.join('')
								.trim(),
						)
						.filter(Boolean);
					const skills = new Y.XmlText();

					skills.applyDelta(
						technologies.map((technology, index) => ({
							insert: technology,
							attributes: { skill: { itemId: String(index) } },
						})),
					);
					child.delete(0, child.length);
					if (technologies.length > 0) child.insert(0, [skills]);
				}
			}

			visit(child);
		}
	};

	visit(fragment);
}

const LEGACY_LABEL_NODE_NAMES = new Set([
	'educationDegree',
	'educationField',
	'educationInstitution',
	'educationGraduationDate',
	'educationDetails',
	'certificateName',
	'certificateInstitution',
	'projectName',
	'projectCompany',
	'projectType',
	'projectSkills',
	'projectTechnologies',
	'skillName',
	'skillCategory',
	'storyTitle',
	'storyNarrative',
	'resumeNarrative',
]);

/**
 * Remove the presentation-only label attribute written by an early version of
 * the structured resume-block extensions. The node allowlist avoids changing
 * any future semantic use of an XML label attribute.
 */
function removeLegacyLabelAttributes(document: Y.Doc) {
	const visit = (container: Y.XmlFragment | Y.XmlElement) => {
		for (const child of container.toArray()) {
			if (!isXmlElement(child)) continue;

			if (
				LEGACY_LABEL_NODE_NAMES.has(child.nodeName) &&
				child.hasAttribute('label')
			) {
				child.removeAttribute('label');
			}

			visit(child);
		}
	};

	visit(document.getXmlFragment('narrative'));
}

const PROFILE_DOCUMENT_MIGRATIONS: readonly ProfileDocumentMigration[] = [
	{
		id: '2026-07-10-add-job-technologies',
		migrate: addJobTechnologies,
	},
	{
		id: '2026-07-10-backfill-missing-job-technologies',
		migrate: addJobTechnologies,
	},
	{
		id: '2026-07-10-convert-job-technologies-to-skill-marks',
		migrate: convertJobTechnologyParagraphsToSkills,
	},
	{
		id: '2026-07-10-remove-legacy-block-labels',
		migrate: removeLegacyLabelAttributes,
	},
];

/**
 * Applies pending migrations in the document itself. The migration ledger is
 * synced alongside the Yjs document, so every CRDT replica agrees on which
 * schema transformations have already run.
 */
export function migrateProfileDocument(document: Y.Doc): boolean {
	const narrative = document.getXmlFragment('narrative');
	if (narrative.length === 0) return false;

	const migrations = document.getMap<boolean>('schemaMigrations');
	const pending = PROFILE_DOCUMENT_MIGRATIONS.filter(
		({ id }) => !migrations.get(id),
	);

	if (pending.length === 0) return false;

	document.transact(() => {
		for (const migration of pending) {
			migration.migrate(document);
			migrations.set(migration.id, true);
		}
	});

	return true;
}

/**
 * Resume sections used to be serialized in a fixed order that rendering
 * ignored. Now that document order places each section, rewrite legacy
 * documents into the order they have always rendered in and mark them, so the
 * projection, the editor, and agent `moveNode` edits all agree.
 */
function orderResumeSections(document: Y.Doc) {
	const root = document
		.getXmlFragment(RESUME_XML_FRAGMENT)
		.toArray()
		.find((child): child is Y.XmlElement => isXmlElement(child) && child.nodeName === 'resume');
	if (!root) return;
	if (root.getAttribute(RESUME_XML_SECTION_ORDER_ATTRIBUTE) === RESUME_XML_SECTION_ORDER_DOCUMENT) {
		return;
	}

	// A document that does not parse is left alone rather than made unloadable;
	// readers keep treating it as a legacy document.
	const xml = serializeXmlElement(root);
	if (!validateResumeXml(xml).valid) return;

	const order = resumeContentFromXml(xml).sectionOrder ?? [];
	const sections = new Map<string, Y.XmlElement>();
	const children = root.toArray();
	for (let index = children.length - 1; index >= 0; index -= 1) {
		const child = children[index];
		if (!isXmlElement(child) || !isResumeSectionKey(child.nodeName)) continue;
		// A Yjs node cannot be re-inserted once deleted, so move a copy.
		sections.set(child.nodeName, parseXmlElement(serializeXmlElement(child)));
		root.delete(index, 1);
	}

	root.insert(
		root.length,
		order.flatMap((key) => sections.get(key) ?? []),
	);
	root.setAttribute(RESUME_XML_SECTION_ORDER_ATTRIBUTE, RESUME_XML_SECTION_ORDER_DOCUMENT);
}

const RESUME_DOCUMENT_MIGRATIONS: readonly ProfileDocumentMigration[] = [
	{
		id: '2026-11-16-order-resume-sections',
		migrate: orderResumeSections,
	},
];

/**
 * Applies pending migrations to a resume document. Like profile migrations,
 * completed IDs are recorded in the document's `schemaMigrations` ledger.
 */
export function migrateResumeDocument(document: Y.Doc): boolean {
	const sharedType = document.share.get(RESUME_XML_FRAGMENT);
	if (!(sharedType instanceof Y.XmlFragment) || sharedType.length === 0) return false;

	const migrations = document.getMap<boolean>('schemaMigrations');
	const pending = RESUME_DOCUMENT_MIGRATIONS.filter(({ id }) => !migrations.get(id));

	if (pending.length === 0) return false;

	document.transact(() => {
		for (const migration of pending) {
			migration.migrate(document);
			migrations.set(migration.id, true);
		}
	});

	return true;
}
