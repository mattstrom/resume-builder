import { XMLParser, XMLValidator } from 'fast-xml-parser';

import type { ResumeBullet, ResumeContent } from './models/resume-content.js';
import type { Resume } from './models/resume.js';

export const RESUME_XML_NAMESPACE = 'https://mattstrom.com/schemas/resume';
export const RESUME_XML_SCHEMA_VERSION = 1;
export const RESUME_XML_FRAGMENT = 'resume';

export type ResumeXmlTarget = { xmlId: string } | { path: string };

export type ResumeXmlOp =
	| { op: 'setText'; target: ResumeXmlTarget; value: string }
	| {
			op: 'setAttribute';
			target: ResumeXmlTarget;
			name: string;
			value: string;
	  }
	| { op: 'removeAttribute'; target: ResumeXmlTarget; name: string }
	| {
			op: 'insertElement';
			target: ResumeXmlTarget;
			position: 'append' | 'prepend' | 'before' | 'after';
			xml: string;
	  }
	| { op: 'removeNode'; target: ResumeXmlTarget }
	| {
			op: 'moveNode';
			target: ResumeXmlTarget;
			parent: ResumeXmlTarget;
			index: number;
	  };

export interface ResumeXmlValidationResult {
	valid: boolean;
	errors: string[];
}

export interface ResumeXmlElementNode {
	name: string;
	xmlId: string;
	attributes: Record<string, string>;
	text: string;
	children: ResumeXmlElementNode[];
}

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	removeNSPrefix: true,
	parseTagValue: false,
	trimValues: false,
	processEntities: true,
});

const orderedParser = new XMLParser({
	preserveOrder: true,
	ignoreAttributes: false,
	attributeNamePrefix: '',
	removeNSPrefix: false,
	parseTagValue: false,
	trimValues: false,
	processEntities: true,
});

type OrderedXmlNode = Record<string, unknown> & {
	':@'?: Record<string, unknown>;
};

function orderedElement(node: OrderedXmlNode): ResumeXmlElementNode | null {
	const name = Object.keys(node).find(
		(key) => key !== ':@' && key !== '#text' && key !== '#cdata' && !key.startsWith('?'),
	);
	if (!name) {
		return null;
	}

	const attributes = Object.fromEntries(
		Object.entries(node[':@'] ?? {}).map(([key, value]) => [key, String(value)]),
	);
	const entries = Array.isArray(node[name]) ? (node[name] as OrderedXmlNode[]) : [];
	const children: ResumeXmlElementNode[] = [];
	let directText = '';

	for (const entry of entries) {
		if ('#text' in entry || '#cdata' in entry) {
			directText += String(entry['#text'] ?? entry['#cdata'] ?? '');
			continue;
		}
		const child = orderedElement(entry);
		if (child) {
			children.push(child);
		}
	}

	return {
		name,
		xmlId: attributes['xml:id'] ?? attributes.id ?? '',
		attributes,
		text: directText,
		children,
	};
}

/**
 * Parses canonical resume XML into an ordered, presentation-neutral element
 * tree. Consumers such as the block editor can use this without first
 * projecting the CRDT document through the legacy ResumeContent model.
 */
export function parseResumeXmlElements(xml: string): ResumeXmlElementNode {
	const validation = validateResumeXml(xml);
	if (!validation.valid) {
		throw new Error(`Invalid resume XML: ${validation.errors.join('; ')}`);
	}

	const parsed = orderedParser.parse(xml) as OrderedXmlNode[];
	const root = parsed.map(orderedElement).find((node) => node?.name === 'resume');

	if (!root) {
		throw new Error('Resume XML has no resume root element');
	}

	return root;
}

function escapeText(value: unknown): string {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function escapeAttribute(value: unknown): string {
	return escapeText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function attrs(values: Record<string, unknown>): string {
	return Object.entries(values)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
		.join('');
}

function element(
	name: string,
	id: string,
	content = '',
	attributes: Record<string, unknown> = {},
): string {
	return `<${name}${attrs({ 'xml:id': id, ...attributes })}>${content}</${name}>`;
}

function normalizeId(value: unknown): string | null {
	if (typeof value !== 'string' || value.length === 0) {
		return null;
	}
	const normalized = value.replace(/[^A-Za-z0-9_.-]/g, '_');

	return `n_${normalized}`;
}

function hash(value: string): string {
	let result = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		result ^= value.charCodeAt(index);
		result = Math.imul(result, 16777619);
	}

	return (result >>> 0).toString(36);
}

export function createResumeXmlId(resumeId: string, path: string, sourceId?: unknown): string {
	return normalizeId(sourceId) ?? `n_${hash(`${resumeId}:${path}`)}`;
}

function textElement(name: string, resumeId: string, path: string, value: unknown): string {
	return element(name, createResumeXmlId(resumeId, path), escapeText(value));
}

function resumeBulletElement(
	name: 'responsibility' | 'item',
	resumeId: string,
	path: string,
	value: ResumeBullet | string,
): string {
	const bullet: Partial<ResumeBullet> & { text: string } =
		typeof value === 'string' ? { text: value } : value;
	const xmlId =
		bullet._id && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(bullet._id)
			? bullet._id
			: createResumeXmlId(resumeId, path, bullet._id);

	return element(name, xmlId, escapeText(bullet.text), {
		'bullet-id': bullet.bulletId,
	});
}

export function resumeToXml(resume: Resume): string {
	const content = resume.data;
	const id = String(resume._id ?? resume.id);
	const section = (name: string, body: string) =>
		element(name, createResumeXmlId(id, name), body);
	const contact = content.contactInformation ?? ({} as ResumeContent['contactInformation']);

	const education = (content.education ?? [])
		.map((degree, index) => {
			const path = `education.${index}`;
			const degreeId = createResumeXmlId(id, path, degree._id);

			return element(
				'degree',
				degreeId,
				textElement('description', id, `${path}.description`, ''),
				{
					title: degree.degree,
					field: degree.field,
					institution: degree.institution,
					graduated: degree.graduated,
				},
			);
		})
		.join('');

	const jobs = (content.workExperience ?? [])
		.map((job, index) => {
			const path = `work-experience.${index}`;
			const jobId = createResumeXmlId(id, path, job._id);
			const responsibilities = (job.responsibilities ?? [])
				.map((value, itemIndex) =>
					resumeBulletElement(
						'responsibility',
						id,
						`${path}.responsibilities.${itemIndex}`,
						value,
					),
				)
				.join('');

			return element(
				'job',
				jobId,
				textElement('description', id, `${path}.description`, '') +
					element(
						'responsibilities',
						createResumeXmlId(id, `${path}.responsibilities`),
						responsibilities,
					),
				{
					company: job.company,
					title: job.position,
					location: job.location,
					'start-date': job.startDate,
					'end-date': job.endDate,
					relevance: job.relevance,
					'source-id': job.sourceId,
				},
			);
		})
		.join('');

	const skills = (content.skills ?? [])
		.map((skill, index) => {
			const path = `skills.${index}`;

			return element(
				'skill',
				createResumeXmlId(id, path, skill._id),
				escapeText(skill.name),
				{ category: skill.category, relevance: skill.relevance },
			);
		})
		.join('');

	const skillGroups = (content.skillGroups ?? [])
		.map((group, index) => {
			const path = `skill-groups.${index}`;

			return element(
				'skill-group',
				createResumeXmlId(id, path, group._id),
				(group.items ?? [])
					.map((item, itemIndex) =>
						textElement('item', id, `${path}.items.${itemIndex}`, item),
					)
					.join(''),
				{ name: group.name },
			);
		})
		.join('');

	const projects = (content.projects ?? [])
		.map((project, index) => {
			const path = `projects.${index}`;

			return element(
				'project',
				createResumeXmlId(id, path, project._id),
				textElement('description', id, `${path}.description`, project.description) +
					element(
						'items',
						createResumeXmlId(id, `${path}.items`),
						(project.items ?? [])
							.map((item, itemIndex) =>
								resumeBulletElement('item', id, `${path}.items.${itemIndex}`, item),
							)
							.join(''),
					) +
					element(
						'technologies',
						createResumeXmlId(id, `${path}.technologies`),
						(project.technologies ?? [])
							.map((technology, itemIndex) =>
								textElement(
									'technology',
									id,
									`${path}.technologies.${itemIndex}`,
									technology,
								),
							)
							.join(''),
					),
				{
					name: project.name,
					type: project.type,
					relevance: project.relevance,
					'source-id': project.sourceId,
				},
			);
		})
		.join('');

	const volunteering = (content.volunteering ?? [])
		.map((entry, index) => {
			const path = `volunteer-experiences.${index}`;

			return element(
				'volunteering',
				createResumeXmlId(id, path, entry._id),
				textElement('description', id, `${path}.description`, '') +
					element(
						'responsibilities',
						createResumeXmlId(id, `${path}.responsibilities`),
						(entry.responsibilities ?? [])
							.map((item, itemIndex) =>
								resumeBulletElement(
									'responsibility',
									id,
									`${path}.responsibilities.${itemIndex}`,
									item,
								),
							)
							.join(''),
					),
				{
					organization: entry.organization ?? '',
					title: entry.position,
					location: entry.location,
					'start-date': entry.startDate,
					'end-date': entry.endDate,
					relevance: entry.relevance,
					'source-id': entry.sourceId,
				},
			);
		})
		.join('');

	return [
		`<resume xmlns="${RESUME_XML_NAMESPACE}"`,
		` xmlns:xml="http://www.w3.org/XML/1998/namespace"`,
		` schema-version="${RESUME_XML_SCHEMA_VERSION}"`,
		` xml:id="${createResumeXmlId(id, 'resume', id)}">`,
		section(
			'contact-info',
			textElement('name', id, 'contact-info.name', content.name) +
				textElement('email', id, 'contact-info.email', contact.email) +
				textElement('phone', id, 'contact-info.phone', contact.phoneNumber) +
				textElement('location', id, 'contact-info.location', contact.location) +
				textElement('github', id, 'contact-info.github', contact.githubProfile) +
				textElement('linkedin', id, 'contact-info.linkedin', contact.linkedInProfile) +
				textElement(
					'personal-website',
					id,
					'contact-info.personal-website',
					contact.personalWebsite,
				),
		),
		textElement('headline', id, 'headline', content.title),
		textElement('summary', id, 'summary', content.summary),
		section('education', education),
		section('work-experience', jobs),
		section('skills', skills + skillGroups),
		section('projects', projects),
		section('volunteer-experiences', volunteering),
		'</resume>',
	].join('');
}

function asNode(value: unknown): XmlNode {
	return value && typeof value === 'object' ? (value as XmlNode) : {};
}

function asArray(value: unknown): unknown[] {
	if (value === undefined || value === null) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.map(text).join('');
	}
	if (!value || typeof value !== 'object') {
		return '';
	}

	return Object.entries(value as XmlNode)
		.filter(([key]) => !key.startsWith('@_'))
		.map(([, entry]) => text(entry))
		.join('');
}

function attribute(node: XmlNode, name: string): string {
	const value = node[`@_${name}`];

	return value === undefined || value === null ? '' : String(value);
}

function optionalNumber(node: XmlNode, name: string): number | undefined {
	const value = attribute(node, name);
	if (value === '') {
		return undefined;
	}
	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : undefined;
}

function nodeId(node: XmlNode): string {
	return attribute(node, 'id');
}

function resumeBullet(value: unknown): ResumeBullet {
	const node = asNode(value);

	return {
		_id: nodeId(node),
		text: text(node),
		bulletId: attribute(node, 'bullet-id') || undefined,
	};
}

export function validateResumeXml(xml: string): ResumeXmlValidationResult {
	const errors: string[] = [];
	if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
		errors.push('DTDs and entity declarations are not allowed');

		return { valid: false, errors };
	}
	const wellFormed = XMLValidator.validate(xml);
	if (wellFormed !== true) {
		errors.push(wellFormed.err.msg);

		return { valid: false, errors };
	}
	const root = asNode(parser.parse(xml)).resume;
	const resume = asNode(root);
	if (!root) {
		errors.push('Expected a resume root element');
	}
	if (attribute(resume, 'schema-version') !== String(RESUME_XML_SCHEMA_VERSION)) {
		errors.push(`Expected schema-version="${RESUME_XML_SCHEMA_VERSION}"`);
	}
	for (const section of [
		'contact-info',
		'headline',
		'summary',
		'education',
		'work-experience',
		'skills',
		'projects',
		'volunteer-experiences',
	]) {
		if (resume[section] === undefined) {
			errors.push(`Missing ${section} element`);
		}
	}

	return { valid: errors.length === 0, errors };
}

export function resumeContentFromXml(xml: string, uid = ''): ResumeContent {
	const validation = validateResumeXml(xml);
	if (!validation.valid) {
		throw new Error(`Invalid resume XML: ${validation.errors.join('; ')}`);
	}
	const resume = asNode(asNode(parser.parse(xml)).resume);
	const contact = asNode(resume['contact-info']);
	const education = asNode(resume.education);
	const work = asNode(resume['work-experience']);
	const skills = asNode(resume.skills);
	const projects = asNode(resume.projects);
	const volunteering = asNode(resume['volunteer-experiences']);

	return {
		_id: nodeId(resume),
		name: text(contact.name),
		title: text(resume.headline),
		summary: text(resume.summary),
		contactInformation: {
			_id: nodeId(contact),
			location: text(contact.location),
			phoneNumber: text(contact.phone),
			email: text(contact.email),
			linkedInProfile: text(contact.linkedin),
			githubProfile: text(contact.github),
			personalWebsite: text(contact['personal-website']),
		},
		education: asArray(education.degree).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				degree: attribute(node, 'title'),
				field: attribute(node, 'field'),
				institution: attribute(node, 'institution'),
				graduated: attribute(node, 'graduated'),
			};
		}),
		workExperience: asArray(work.job).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				company: attribute(node, 'company'),
				position: attribute(node, 'title'),
				location: attribute(node, 'location'),
				startDate: attribute(node, 'start-date'),
				endDate: attribute(node, 'end-date') || undefined,
				sourceId: attribute(node, 'source-id') || undefined,
				responsibilities: asArray(asNode(node.responsibilities).responsibility).map(
					resumeBullet,
				),
				relevance: optionalNumber(node, 'relevance'),
			};
		}),
		skills: asArray(skills.skill).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				name: text(node),
				category: attribute(node, 'category'),
				relevance: optionalNumber(node, 'relevance'),
			};
		}),
		skillGroups: asArray(skills['skill-group']).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				name: attribute(node, 'name'),
				items: asArray(node.item).map(text),
			};
		}),
		projects: asArray(projects.project).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				name: attribute(node, 'name'),
				description: text(node.description),
				sourceId: attribute(node, 'source-id') || undefined,
				technologies: asArray(asNode(node.technologies).technology).map(text),
				items: asArray(asNode(node.items).item).map(resumeBullet),
				type: attribute(node, 'type') || undefined,
				relevance: optionalNumber(node, 'relevance'),
			};
		}),
		volunteering: asArray(volunteering.volunteering).map((value) => {
			const node = asNode(value);

			return {
				_id: nodeId(node),
				uid,
				organization: attribute(node, 'organization') || undefined,
				position: attribute(node, 'title'),
				location: attribute(node, 'location') || undefined,
				startDate: attribute(node, 'start-date'),
				endDate: attribute(node, 'end-date') || undefined,
				sourceId: attribute(node, 'source-id') || undefined,
				responsibilities: asArray(asNode(node.responsibilities).responsibility).map(
					resumeBullet,
				),
				relevance: optionalNumber(node, 'relevance'),
			};
		}),
	};
}
