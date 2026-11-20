import * as Y from 'yjs';

import { RESUME_XML_FRAGMENT } from './resume-xml.js';

/**
 * A parser-neutral description of an XML node. The browser builds it from a
 * DOM tree and the CRDT server from fast-xml-parser output, so both can
 * reconcile against the shared Yjs document the same way.
 */
export type XmlNodeSpec =
	| {
			type: 'element';
			name: string;
			attributes: Record<string, string>;
			children: XmlNodeSpec[];
	  }
	| { type: 'text'; text: string };

type YXmlNode = Y.XmlElement | Y.XmlText;
type YXmlContainer = Y.XmlFragment | Y.XmlElement;

const ID_ATTRIBUTE = 'xml:id';

function idOf(node: YXmlNode | Y.XmlHook): string | undefined {
	if (!(node instanceof Y.XmlElement)) return undefined;
	const id = node.getAttribute(ID_ATTRIBUTE);
	return typeof id === 'string' && id ? id : undefined;
}

function specIdOf(spec: XmlNodeSpec): string | undefined {
	return spec.type === 'element' ? spec.attributes[ID_ATTRIBUTE] || undefined : undefined;
}

function matches(node: YXmlNode | Y.XmlHook, spec: XmlNodeSpec): boolean {
	if (spec.type === 'text') return node instanceof Y.XmlText;
	return (
		node instanceof Y.XmlElement && node.nodeName === spec.name && idOf(node) === specIdOf(spec)
	);
}

function build(spec: XmlNodeSpec): YXmlNode {
	if (spec.type === 'text') {
		const text = new Y.XmlText();
		text.insert(0, spec.text);
		return text;
	}

	const element = new Y.XmlElement(spec.name);
	for (const [name, value] of Object.entries(spec.attributes)) {
		element.setAttribute(name, value);
	}
	const children = spec.children.map(build);
	if (children.length > 0) element.insert(0, children);
	return element;
}

/** Rewrite only the changed middle of a text node so concurrent typing merges. */
function reconcileText(node: Y.XmlText, next: string) {
	const current = node.toString();
	if (current === next) return;

	let prefix = 0;
	const max = Math.min(current.length, next.length);
	while (prefix < max && current[prefix] === next[prefix]) prefix++;

	let suffix = 0;
	while (
		suffix < max - prefix &&
		current[current.length - 1 - suffix] === next[next.length - 1 - suffix]
	) {
		suffix++;
	}

	const removed = current.length - prefix - suffix;
	if (removed > 0) node.delete(prefix, removed);
	const inserted = next.slice(prefix, next.length - suffix);
	if (inserted) node.insert(prefix, inserted);
}

function reconcileAttributes(element: Y.XmlElement, attributes: Record<string, string>) {
	const current = element.getAttributes() as Record<string, unknown>;
	for (const name of Object.keys(current)) {
		if (!(name in attributes)) element.removeAttribute(name);
	}
	for (const [name, value] of Object.entries(attributes)) {
		if (current[name] !== value) element.setAttribute(name, value);
	}
}

/**
 * Make `container`'s children match `specs` while keeping every existing node
 * that still has a counterpart. Elements are matched by name and `xml:id`, so
 * an edit touches only the nodes that actually changed.
 *
 * Replacing a whole subtree (delete everything, insert a fresh copy) is not
 * safe in a CRDT: two peers doing it at once both keep their insert, and the
 * merged document ends up with two copies side by side.
 */
function reconcileChildren(container: YXmlContainer, specs: XmlNodeSpec[]) {
	// Ids still to be placed at or after the current index. An existing node
	// whose id is absent here has been removed (or moved earlier) and goes.
	const pendingIds = new Map<string, number>();
	for (const spec of specs) {
		const id = specIdOf(spec);
		if (id) pendingIds.set(id, (pendingIds.get(id) ?? 0) + 1);
	}

	for (let index = 0; index < specs.length; index++) {
		const spec = specs[index];

		while (index < container.length) {
			const current = container.get(index);
			if (matches(current, spec)) break;
			const id = idOf(current);
			if (id && !pendingIds.get(id)) {
				container.delete(index, 1);
				continue;
			}
			break;
		}

		const specId = specIdOf(spec);
		if (specId) pendingIds.set(specId, (pendingIds.get(specId) ?? 1) - 1);

		const current = index < container.length ? container.get(index) : undefined;
		if (current && matches(current, spec)) {
			if (spec.type === 'text') {
				reconcileText(current as Y.XmlText, spec.text);
			} else {
				const element = current as Y.XmlElement;
				reconcileAttributes(element, spec.attributes);
				reconcileChildren(element, spec.children);
			}
			continue;
		}

		container.insert(index, [build(spec)]);
	}

	if (container.length > specs.length) {
		container.delete(specs.length, container.length - specs.length);
	}
}

/**
 * Bring the resume fragment in line with `root`, editing the existing
 * `<resume>` element in place. Any surplus roots are removed along the way.
 * Call inside a `doc.transact` so the change lands as one update.
 */
export function reconcileResumeXmlFragment(fragment: Y.XmlFragment, root: XmlNodeSpec) {
	if (root.type !== 'element' || root.name !== 'resume') {
		throw new Error('Resume XML root must be a <resume> element');
	}
	reconcileChildren(fragment, [root]);
}

/**
 * Collapse a resume fragment that holds more than one root down to the first
 * `<resume>` element.
 *
 * Every peer sees Yjs siblings in the same order, so keeping the first one
 * converges everywhere without coordination. Returns whether anything changed.
 */
export function normalizeResumeXmlRoots(document: Y.Doc): boolean {
	const sharedType = document.share.get(RESUME_XML_FRAGMENT);
	if (!(sharedType instanceof Y.XmlFragment)) return false;

	const children = sharedType.toArray();
	const keep = children.findIndex(
		(child) => child instanceof Y.XmlElement && child.nodeName === 'resume',
	);
	if (keep === -1 || children.length === 1) return false;

	document.transact(() => {
		const after = sharedType.length - keep - 1;
		if (after > 0) sharedType.delete(keep + 1, after);
		if (keep > 0) sharedType.delete(0, keep);
	});

	return true;
}
