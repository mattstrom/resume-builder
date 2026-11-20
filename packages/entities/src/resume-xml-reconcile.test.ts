import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import {
	normalizeResumeXmlRoots,
	reconcileResumeXmlFragment,
	type XmlNodeSpec,
} from './resume-xml-reconcile.js';
import { RESUME_XML_FRAGMENT } from './resume-xml.js';

function text(value: string): XmlNodeSpec {
	return { type: 'text', text: value };
}

function element(
	name: string,
	attributes: Record<string, string>,
	children: XmlNodeSpec[] = [],
): XmlNodeSpec {
	return { type: 'element', name, attributes, children };
}

function resume(...children: XmlNodeSpec[]): XmlNodeSpec {
	return element('resume', { 'xml:id': 'r1' }, children);
}

function bullet(id: string, value: string): XmlNodeSpec {
	return element('bullet', { 'xml:id': id }, [text(value)]);
}

function fragmentOf(doc: Y.Doc) {
	return doc.getXmlFragment(RESUME_XML_FRAGMENT);
}

function seed(doc: Y.Doc, root: XmlNodeSpec) {
	doc.transact(() => reconcileResumeXmlFragment(fragmentOf(doc), root));
}

function sync(a: Y.Doc, b: Y.Doc) {
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
}

describe('reconcileResumeXmlFragment', () => {
	it('edits the existing root in place instead of replacing it', () => {
		// Arrange
		const doc = new Y.Doc();
		seed(doc, resume(bullet('b1', 'First')));
		const originalRoot = fragmentOf(doc).get(0);

		// Act
		seed(doc, resume(bullet('b1', 'First edited')));

		// Assert
		expect(fragmentOf(doc).length).toBe(1);
		expect(fragmentOf(doc).get(0)).toBe(originalRoot);
		expect(fragmentOf(doc).toString()).toBe(
			'<resume xml:id="r1"><bullet xml:id="b1">First edited</bullet></resume>',
		);
	});

	it('keeps a single root when two peers edit concurrently', () => {
		// Arrange
		const a = new Y.Doc();
		const b = new Y.Doc();
		seed(a, resume(bullet('b1', 'One'), bullet('b2', 'Two')));
		sync(a, b);

		// Act
		seed(a, resume(bullet('b1', 'One from A'), bullet('b2', 'Two')));
		seed(b, resume(bullet('b1', 'One'), bullet('b2', 'Two'), bullet('b3', 'Three from B')));
		sync(a, b);

		// Assert
		const roots = fragmentOf(a).toArray();
		expect(roots).toHaveLength(1);
		expect(fragmentOf(a).toString()).toBe(fragmentOf(b).toString());
		expect(fragmentOf(a).toString()).toContain('One from A');
		expect(fragmentOf(a).toString()).toContain('Three from B');
	});

	it('inserts, removes and reorders children matched by xml:id', () => {
		// Arrange
		const doc = new Y.Doc();
		seed(doc, resume(bullet('b1', 'One'), bullet('b2', 'Two'), bullet('b3', 'Three')));
		// Act
		seed(doc, resume(bullet('b0', 'Zero'), bullet('b3', 'Three'), bullet('b1', 'One')));

		// Assert
		const root = fragmentOf(doc).get(0) as Y.XmlElement;
		expect(
			root.toArray().map((child) => (child as Y.XmlElement).getAttribute('xml:id')),
		).toEqual(['b0', 'b3', 'b1']);
	});

	it('keeps untouched siblings when inserting ahead of them', () => {
		// Arrange
		const doc = new Y.Doc();
		seed(doc, resume(bullet('b1', 'One'), bullet('b2', 'Two')));
		const [first, second] = (fragmentOf(doc).get(0) as Y.XmlElement).toArray();

		// Act
		seed(doc, resume(bullet('b0', 'Zero'), bullet('b1', 'One'), bullet('b2', 'Two')));

		// Assert
		const root = fragmentOf(doc).get(0) as Y.XmlElement;
		expect(root.length).toBe(3);
		expect(root.get(1)).toBe(first);
		expect(root.get(2)).toBe(second);
	});

	it('syncs attributes on matched elements', () => {
		// Arrange
		const doc = new Y.Doc();
		seed(doc, element('resume', { 'xml:id': 'r1', theme: 'dark', lang: 'en' }));

		// Act
		seed(doc, element('resume', { 'xml:id': 'r1', theme: 'light' }));

		// Assert
		expect((fragmentOf(doc).get(0) as Y.XmlElement).getAttributes()).toEqual({
			'xml:id': 'r1',
			theme: 'light',
		});
	});

	it('collapses roots that already diverged', () => {
		// Arrange
		const doc = new Y.Doc();
		fragmentOf(doc).insert(0, [new Y.XmlElement('resume'), new Y.XmlElement('resume')]);

		// Act
		seed(doc, resume(bullet('b1', 'Only')));

		// Assert
		expect(fragmentOf(doc).length).toBe(1);
	});

	it('rejects a root that is not <resume>', () => {
		// Arrange
		const doc = new Y.Doc();

		// Act
		const act = () => reconcileResumeXmlFragment(fragmentOf(doc), element('cv', {}));

		// Assert
		expect(act).toThrow('<resume>');
	});
});

describe('normalizeResumeXmlRoots', () => {
	it('keeps the first resume root and removes every other node', () => {
		// Arrange
		const doc = new Y.Doc();
		const first = new Y.XmlElement('resume');
		first.setAttribute('xml:id', 'first');
		const second = new Y.XmlElement('resume');
		second.setAttribute('xml:id', 'second');
		fragmentOf(doc).insert(0, [new Y.XmlText('stray'), first, second]);

		// Act
		const changed = normalizeResumeXmlRoots(doc);

		// Assert
		expect(changed).toBe(true);
		expect(fragmentOf(doc).length).toBe(1);
		expect((fragmentOf(doc).get(0) as Y.XmlElement).getAttribute('xml:id')).toBe('first');
	});

	it('is a no-op on an already normalized document', () => {
		// Arrange
		const doc = new Y.Doc();
		seed(doc, resume());

		// Act
		const changed = normalizeResumeXmlRoots(doc);

		// Assert
		expect(changed).toBe(false);
		expect(fragmentOf(doc).length).toBe(1);
	});

	it('converges two peers that each normalize independently', () => {
		// Arrange
		const a = new Y.Doc();
		const b = new Y.Doc();
		seed(a, resume(bullet('b1', 'A')));
		fragmentOf(b).insert(0, [new Y.XmlElement('resume')]);
		sync(a, b);
		expect(fragmentOf(a).length).toBe(2);

		// Act
		normalizeResumeXmlRoots(a);
		normalizeResumeXmlRoots(b);
		sync(a, b);

		// Assert
		expect(fragmentOf(a).length).toBe(1);
		expect(fragmentOf(a).toString()).toBe(fragmentOf(b).toString());
	});

	it('ignores documents without a resume fragment', () => {
		// Arrange
		const doc = new Y.Doc();

		// Act
		const changed = normalizeResumeXmlRoots(doc);

		// Assert
		expect(changed).toBe(false);
	});
});
