import {
	RESUME_XML_FRAGMENT,
	type ResumeXmlOp,
	type ResumeXmlTarget,
	resumeContentFromXml,
	validateResumeXml,
} from '@resume-builder/entities';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import * as Y from 'yjs';

type OrderedNode = Record<string, unknown> & {
	':@'?: Record<string, unknown>;
};

const parser = new XMLParser({
	preserveOrder: true,
	ignoreAttributes: false,
	attributeNamePrefix: '',
	processEntities: true,
	trimValues: false,
});

export function getExistingResumeXmlFragment(document: Y.Doc): Y.XmlFragment | null {
	const sharedType = document.share.get(RESUME_XML_FRAGMENT);
	return sharedType instanceof Y.XmlFragment ? sharedType : null;
}

export function getExistingLegacyResumeMap(document: Y.Doc): Y.Map<unknown> | null {
	const sharedType = document.share.get(RESUME_XML_FRAGMENT);
	return sharedType instanceof Y.Map ? sharedType : null;
}

function buildText(value: unknown): Y.XmlText {
	const text = new Y.XmlText();
	text.insert(0, String(value ?? ''));
	return text;
}

function buildElement(node: OrderedNode): Y.XmlElement {
	const name = Object.keys(node).find((key) => key !== ':@');
	if (!name) throw new Error('XML element has no name');

	const element = new Y.XmlElement(name);
	for (const [attribute, value] of Object.entries(node[':@'] ?? {})) {
		element.setAttribute(attribute, String(value));
	}

	const children = node[name];
	if (Array.isArray(children)) {
		const built: Array<Y.XmlText | Y.XmlElement> = [];
		for (const child of children) {
			const ordered = child as OrderedNode;
			if ('#text' in ordered) built.push(buildText(ordered['#text']));
			else if ('#cdata' in ordered) built.push(buildText(ordered['#cdata']));
			else built.push(buildElement(ordered));
		}
		if (built.length > 0) element.insert(0, built);
	}

	return element;
}

function escapeText(value: string): string {
	return value.replace(/[&<>]/g, (character) => {
		if (character === '&') return '&amp;';
		if (character === '<') return '&lt;';
		return '&gt;';
	});
}

function escapeAttribute(value: string): string {
	return escapeText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function serializeXmlElement(element: Y.XmlElement): string {
	const attributes = Object.entries(element.getAttributes())
		.map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
		.join('');
	const content = element
		.toArray()
		.map((child) => {
			if (child instanceof Y.XmlElement) return serializeXmlElement(child);
			if (child instanceof Y.XmlText) return escapeText(child.toString());
			return '';
		})
		.join('');
	return `<${element.nodeName}${attributes}>${content}</${element.nodeName}>`;
}

export function serializeResumeXml(document: Y.Doc): string {
	const fragment = document.getXmlFragment(RESUME_XML_FRAGMENT);
	const roots = fragment
		.toArray()
		.filter((child): child is Y.XmlElement => child instanceof Y.XmlElement);
	if (roots.length !== 1 || roots[0].nodeName !== 'resume') {
		throw new Error('Resume document must contain exactly one resume root element');
	}
	return serializeXmlElement(roots[0]);
}

export function replaceResumeXml(document: Y.Doc, xml: string): void {
	const validation = validateResumeXml(xml);
	if (!validation.valid) {
		throw new Error(`Invalid resume XML: ${validation.errors.join('; ')}`);
	}

	const parsed = parser.parse(xml) as OrderedNode[];
	const rootNode = parsed.find((node) => 'resume' in node);
	if (!rootNode) throw new Error('Resume XML has no resume root');
	const root = buildElement(rootNode);
	const fragment = document.getXmlFragment(RESUME_XML_FRAGMENT);
	if (fragment.length > 0) fragment.delete(0, fragment.length);
	fragment.insert(0, [root]);
}

export function getResumeContent(document: Y.Doc, uid: string) {
	return resumeContentFromXml(serializeResumeXml(document), uid);
}

export function parseXmlElement(xml: string): Y.XmlElement {
	if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
		throw new Error('DTDs and entity declarations are not allowed');
	}
	const result = XMLValidator.validate(xml);
	if (result !== true) throw new Error(`Invalid XML fragment: ${result.err.msg}`);
	const parsed = parser.parse(xml) as OrderedNode[];
	const node = parsed.find((entry) =>
		Object.keys(entry).some((key) => key !== ':@' && !key.startsWith('?')),
	);
	if (!node) throw new Error('XML fragment must contain one element');
	return buildElement(node);
}

function findById(container: Y.XmlFragment | Y.XmlElement, xmlId: string): Y.XmlElement | null {
	for (const child of container.toArray()) {
		if (!(child instanceof Y.XmlElement)) continue;
		if (child.getAttribute('xml:id') === xmlId) return child;
		const nested = findById(child, xmlId);
		if (nested) return nested;
	}
	return null;
}

function resolveTarget(document: Y.Doc, target: ResumeXmlTarget): Y.XmlElement {
	if ('path' in target) {
		throw new Error('Path targets are not implemented; use a stable xml:id target');
	}
	const element = findById(document.getXmlFragment(RESUME_XML_FRAGMENT), target.xmlId);
	if (!element) throw new Error(`XML node "${target.xmlId}" was not found`);
	return element;
}

function replaceTextPreservingMarkup(element: Y.XmlElement, value: string) {
	const children = element.toArray();
	for (let index = children.length - 1; index >= 0; index -= 1) {
		if (children[index] instanceof Y.XmlText) element.delete(index, 1);
	}
	const text = buildText(value);
	element.insert(0, [text]);
}

function applyResumeXmlOpsUnsafe(document: Y.Doc, ops: ResumeXmlOp[]): void {
	for (const op of ops) {
		const target = resolveTarget(document, op.target);
		switch (op.op) {
			case 'setText':
				replaceTextPreservingMarkup(target, op.value);
				break;
			case 'setAttribute':
				if (op.name === 'xml:id' || op.name === 'schema-version') {
					throw new Error(`Attribute "${op.name}" is immutable`);
				}
				target.setAttribute(op.name, op.value);
				break;
			case 'removeAttribute':
				if (op.name === 'xml:id' || op.name === 'schema-version') {
					throw new Error(`Attribute "${op.name}" is immutable`);
				}
				target.removeAttribute(op.name);
				break;
			case 'insertElement': {
				const inserted = parseXmlElement(op.xml);
				if (op.position === 'append') {
					target.insert(target.length, [inserted]);
				} else if (op.position === 'prepend') {
					target.insert(0, [inserted]);
				} else {
					const parent = target.parent;
					if (!(parent instanceof Y.XmlElement || parent instanceof Y.XmlFragment)) {
						throw new Error('Target has no XML parent');
					}
					const index = parent.toArray().indexOf(target);
					parent.insert(op.position === 'before' ? index : index + 1, [inserted]);
				}
				break;
			}
			case 'removeNode': {
				const parent = target.parent;
				if (!(parent instanceof Y.XmlElement)) {
					throw new Error('The resume root cannot be removed');
				}
				parent.delete(parent.toArray().indexOf(target), 1);
				break;
			}
			case 'moveNode': {
				const parent = resolveTarget(document, op.parent);
				const clone = parseXmlElement(serializeXmlElement(target));
				const oldParent = target.parent;
				if (!(oldParent instanceof Y.XmlElement)) {
					throw new Error('The resume root cannot be moved');
				}
				oldParent.delete(oldParent.toArray().indexOf(target), 1);
				parent.insert(Math.max(0, Math.min(op.index, parent.length)), [clone]);
				break;
			}
		}
	}
}

export function applyResumeXmlOps(document: Y.Doc, ops: ResumeXmlOp[]): void {
	const candidate = new Y.Doc();
	Y.applyUpdate(candidate, Y.encodeStateAsUpdate(document));
	applyResumeXmlOpsUnsafe(candidate, ops);
	const validation = validateResumeXml(serializeResumeXml(candidate));
	if (!validation.valid) {
		candidate.destroy();
		throw new Error(
			`XML operations violate the resume schema: ${validation.errors.join('; ')}`,
		);
	}
	const update = Y.encodeStateAsUpdate(candidate, Y.encodeStateVector(document));
	Y.applyUpdate(document, update);
	candidate.destroy();
}
