import * as Y from 'yjs';

type ProfileDocumentMigration = {
	id: string;
	migrate: (document: Y.Doc) => void;
};

function isXmlElement(value: unknown): value is Y.XmlElement {
	return value instanceof Y.XmlElement;
}

function createJobTechnologies(): Y.XmlElement {
	const technologies = new Y.XmlElement('jobTechnologies');
	const paragraph = new Y.XmlElement('paragraph');

	technologies.insert(0, [paragraph]);

	return technologies;
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

				if (!hasTechnologies && narrativeIndex >= 0) {
					child.insert(narrativeIndex, [createJobTechnologies()]);
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
