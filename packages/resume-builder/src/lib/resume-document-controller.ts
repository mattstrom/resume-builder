import { HocuspocusProvider } from '@hocuspocus/provider';
import {
	RESUME_XML_FRAGMENT,
	RESUME_XML_NAMESPACE,
	parseResumeXmlElement,
	type Resume,
	type ResumeBullet,
	type ResumeXmlElementNode,
	type ResumeXmlOp,
	resumeContentFromXml,
	resumeToXml,
	validateResumeXml,
} from '@resume-builder/entities';
import { nanoid } from 'nanoid';
import * as Y from 'yjs';

import { getResumeCollectionPath, ResumeCollections } from '../graphql/resume-collections.ts';
import { reorderItems } from './reorder.ts';

export type ResumeConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ResumeDocumentController {
	readonly resumeId: string;
	getSnapshot(): Resume | null;
	getXml(): string | null;
	replaceResume(resume: Resume): void;
	replaceXml(xml: string): void;
	setField(path: string, value: unknown): void | Promise<void>;
	moveArrayItem(path: string, fromIndex: number, toIndex: number): void | Promise<void>;
	applyXmlOps(ops: readonly ResumeXmlOp[]): void | Promise<void>;
	addCollectionItem(collection: ResumeCollectionValue): void | Promise<void>;
	insertCollectionItem(collection: ResumeCollectionValue, index: number): void | Promise<void>;
	removeCollectionItem(collection: ResumeCollectionValue, index: number): void | Promise<void>;
	undo(): void | Promise<void>;
	redo(): void | Promise<void>;
	destroy(): Promise<void>;
}

interface LocalResumeControllerOptions {
	resume: Resume;
	onSnapshotChange?: (resume: Resume | null) => void;
}

type ResumeCollectionValue = (typeof ResumeCollections)[keyof typeof ResumeCollections];

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface BulletContainer {
	_id?: string;
	responsibilities?: ResumeBullet[];
	items?: ResumeBullet[];
}

function detachChangedBulletReferences(current: Resume, next: Resume): Resume {
	const result = structuredClone(next);
	const sections: Array<{
		current: BulletContainer[] | undefined;
		next: BulletContainer[] | undefined;
		field: 'responsibilities' | 'items';
	}> = [
		{
			current: current.data.workExperience,
			next: result.data.workExperience,
			field: 'responsibilities',
		},
		{ current: current.data.projects, next: result.data.projects, field: 'items' },
		{
			current: current.data.volunteering,
			next: result.data.volunteering,
			field: 'responsibilities',
		},
	];

	for (const section of sections) {
		const currentContainers = new Map(
			(section.current ?? []).map((container, index) => [
				container._id ?? String(index),
				container,
			]),
		);
		for (const [containerIndex, nextContainer] of (section.next ?? []).entries()) {
			const currentContainer = currentContainers.get(
				nextContainer._id ?? String(containerIndex),
			);
			const currentBullets = new Map(
				(currentContainer?.[section.field] ?? []).map((bullet) => [bullet._id, bullet]),
			);
			for (const nextBullet of nextContainer[section.field] ?? []) {
				const currentBullet = currentBullets.get(nextBullet._id);
				if (
					currentBullet?.bulletId &&
					nextBullet.bulletId === currentBullet.bulletId &&
					nextBullet.text !== currentBullet.text
				) {
					delete nextBullet.bulletId;
				}
			}
		}
	}

	return result;
}

function escapeXml(value: string) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function serializeElement(element: Y.XmlElement): string {
	const attributes = Object.entries(element.getAttributes())
		.map(([name, value]) => ` ${name}="${escapeXml(String(value)).replaceAll('"', '&quot;')}"`)
		.join('');
	const content = element
		.toArray()
		.map((child) =>
			child instanceof Y.XmlElement
				? serializeElement(child)
				: child instanceof Y.XmlText
					? escapeXml(child.toString())
					: '',
		)
		.join('');
	return `<${element.nodeName}${attributes}>${content}</${element.nodeName}>`;
}

function serializeFragment(fragment: Y.XmlFragment): string {
	const root = fragment
		.toArray()
		.find((child): child is Y.XmlElement => child instanceof Y.XmlElement);
	if (!root) throw new Error('Resume XML document has no root element');
	return serializeElement(root);
}

function domElementToY(element: Element): Y.XmlElement {
	const result = new Y.XmlElement(element.tagName);
	for (const attribute of Array.from(element.attributes)) {
		result.setAttribute(attribute.name, attribute.value);
	}
	const children: Array<Y.XmlElement | Y.XmlText> = [];
	for (const child of Array.from(element.childNodes)) {
		if (child.nodeType === Node.ELEMENT_NODE) {
			children.push(domElementToY(child as Element));
		} else if (child.nodeType === Node.TEXT_NODE && child.textContent) {
			const text = new Y.XmlText();
			text.insert(0, child.textContent);
			children.push(text);
		}
	}
	if (children.length > 0) result.insert(0, children);
	return result;
}

function parsedElementToY(element: ResumeXmlElementNode): Y.XmlElement {
	const result = new Y.XmlElement(element.name);
	for (const [name, value] of Object.entries(element.attributes)) {
		result.setAttribute(name, value);
	}
	const children: Array<Y.XmlElement | Y.XmlText> = [];
	if (element.text) {
		const text = new Y.XmlText();
		text.insert(0, element.text);
		children.push(text);
	}
	children.push(...element.children.map(parsedElementToY));
	if (children.length > 0) result.insert(0, children);
	return result;
}

function replaceFragmentXml(fragment: Y.XmlFragment, xml: string) {
	const validation = validateResumeXml(xml);
	if (!validation.valid) {
		throw new Error(`Invalid resume XML: ${validation.errors.join('; ')}`);
	}
	const dom = new DOMParser().parseFromString(xml, 'application/xml');
	const error = dom.querySelector('parsererror');
	if (error) throw new Error(error.textContent ?? 'Invalid resume XML');
	const root = dom.documentElement;
	if (fragment.length > 0) fragment.delete(0, fragment.length);
	fragment.insert(0, [domElementToY(root)]);
}

function findXmlElement(
	container: Y.XmlFragment | Y.XmlElement,
	xmlId: string,
): Y.XmlElement | null {
	for (const child of container.toArray()) {
		if (!(child instanceof Y.XmlElement)) continue;
		if (child.getAttribute('xml:id') === xmlId) return child;
		const nested = findXmlElement(child, xmlId);
		if (nested) return nested;
	}
	return null;
}

function cloneXmlElement(source: Y.XmlElement): Y.XmlElement {
	const clone = new Y.XmlElement(source.nodeName);
	for (const [name, value] of Object.entries(source.getAttributes())) {
		clone.setAttribute(name, String(value));
	}
	const children = source.toArray().map((child) => {
		if (child instanceof Y.XmlElement) return cloneXmlElement(child);
		const text = new Y.XmlText();
		if (child instanceof Y.XmlText && child.length > 0) text.insert(0, child.toString());
		return text;
	});
	if (children.length > 0) clone.insert(0, children);
	return clone;
}

function replaceElementText(element: Y.XmlElement, value: string) {
	const children = element.toArray();
	for (let index = children.length - 1; index >= 0; index -= 1) {
		if (children[index] instanceof Y.XmlText) element.delete(index, 1);
	}
	const text = new Y.XmlText();
	if (value.length > 0) text.insert(0, value);
	element.insert(0, [text]);
}

export function applyXmlOpsToFragment(fragment: Y.XmlFragment, ops: readonly ResumeXmlOp[]) {
	const resolve = (target: ResumeXmlOp['target']) => {
		if ('path' in target) {
			throw new Error('Path targets are not implemented; use a stable xml:id target');
		}
		const element = findXmlElement(fragment, target.xmlId);
		if (!element) throw new Error(`XML node "${target.xmlId}" was not found`);
		return element;
	};

	for (const op of ops) {
		const target = resolve(op.target);
		switch (op.op) {
			case 'setText':
				replaceElementText(target, op.value);
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
			case 'moveNode': {
				const parent = resolve(op.parent);
				const oldParent = target.parent;
				if (!(oldParent instanceof Y.XmlElement)) {
					throw new Error('The resume root cannot be moved');
				}
				const clone = cloneXmlElement(target);
				oldParent.delete(oldParent.toArray().indexOf(target), 1);
				const elementChildren = parent
					.toArray()
					.filter((child): child is Y.XmlElement => child instanceof Y.XmlElement);
				const elementIndex = Math.max(0, Math.min(op.index, elementChildren.length));
				const rawIndex =
					elementIndex === elementChildren.length
						? parent.length
						: parent.toArray().indexOf(elementChildren[elementIndex]!);
				parent.insert(rawIndex, [clone]);
				break;
			}
			case 'insertElement': {
				const inserted = parsedElementToY(parseResumeXmlElement(op.xml));
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
			case 'removeNode':
				throw new Error(`XML operation "${op.op}" is not supported by the resume editor`);
		}
	}
}

function preserveExtensionMarkup(currentXml: string, replacementXml: string) {
	if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
		return replacementXml;
	}

	const parser = new DOMParser();
	const current = parser.parseFromString(currentXml, 'application/xml');
	const replacement = parser.parseFromString(replacementXml, 'application/xml');

	if (current.querySelector('parsererror') || replacement.querySelector('parsererror')) {
		return replacementXml;
	}

	const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
	const xmlnsNamespace = 'http://www.w3.org/2000/xmlns/';
	const currentById = new Map<string, Element>();

	for (const element of current.querySelectorAll('[xml\\:id]')) {
		const id = element.getAttributeNS(xmlNamespace, 'id');
		if (id) currentById.set(id, element);
	}

	for (const target of replacement.querySelectorAll('[xml\\:id]')) {
		const id = target.getAttributeNS(xmlNamespace, 'id');
		const source = id ? currentById.get(id) : undefined;
		if (!source) continue;

		for (const attribute of Array.from(source.attributes)) {
			if (
				attribute.namespaceURI &&
				attribute.namespaceURI !== RESUME_XML_NAMESPACE &&
				attribute.namespaceURI !== xmlNamespace &&
				attribute.namespaceURI !== xmlnsNamespace
			) {
				target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
			}
		}

		for (const child of Array.from(source.children)) {
			if (child.namespaceURI && child.namespaceURI !== RESUME_XML_NAMESPACE) {
				target.appendChild(replacement.importNode(child, true));
			}
		}
	}

	return new XMLSerializer().serializeToString(replacement);
}

function parsePath(path: string) {
	return path.split('.').map((segment) => {
		return /^\d+$/.test(segment) ? Number(segment) : segment;
	});
}

function cloneWithPathValue<T>(source: T, path: string, value: unknown): T {
	const clone = structuredClone(source) as Record<string, unknown>;
	const segments = parsePath(path);
	let current: Record<string, unknown> | unknown[] = clone;

	for (let index = 0; index < segments.length - 1; index += 1) {
		const segment = segments[index]!;
		const nextSegment = segments[index + 1];
		const key = String(segment);
		const nextValue =
			(current as Record<string, unknown>)[key] ??
			(typeof nextSegment === 'number' ? [] : {});

		(current as Record<string, unknown>)[key] = structuredClone(nextValue);
		current = (current as Record<string, unknown>)[key] as Record<string, unknown> | unknown[];
	}

	if (segments.length === 0) {
		return clone as T;
	}

	const lastSegment = segments[segments.length - 1]!;

	if (Array.isArray(current) && typeof lastSegment === 'number') {
		current[lastSegment] = value;
		return clone as T;
	}

	(current as Record<string, unknown>)[String(lastSegment)] = value;
	return clone as T;
}

function createDefaultCollectionItem(collection: ResumeCollectionValue, resume: Resume) {
	const base = {
		uid: resume.uid,
	};

	switch (collection) {
		case ResumeCollections.WORK_EXPERIENCE:
			return {
				...base,
				company: resume.company ?? '',
				position: 'New Role',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			};
		case ResumeCollections.PROJECTS:
			return {
				...base,
				_id: nanoid(),
				name: 'New Project',
				description: '',
				technologies: [],
				items: [],
				type: '',
			};
		case ResumeCollections.VOLUNTEERING:
			return {
				...base,
				organization: '',
				position: 'New Role',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			};
		default:
			throw new Error(`Unsupported collection "${collection}"`);
	}
}

export class LocalResumeController implements ResumeDocumentController {
	readonly resumeId: string;

	protected snapshot: Resume | null;
	protected undoStack: Resume[] = [];
	protected redoStack: Resume[] = [];

	constructor(protected readonly options: LocalResumeControllerOptions) {
		this.resumeId = options.resume._id;
		this.snapshot = structuredClone(options.resume);
	}

	getSnapshot() {
		return this.snapshot;
	}

	getXml() {
		return this.snapshot ? (this.snapshot.xml ?? resumeToXml(this.snapshot)) : null;
	}

	protected emitSnapshot() {
		if (this.snapshot) {
			const replacementXml = resumeToXml(this.snapshot);
			this.snapshot.xml = this.snapshot.xml
				? preserveExtensionMarkup(this.snapshot.xml, replacementXml)
				: replacementXml;
		}
		this.options.onSnapshotChange?.(this.snapshot);
	}

	protected pushUndoSnapshot() {
		if (!this.snapshot) {
			return;
		}

		this.undoStack.push(structuredClone(this.snapshot));
		this.redoStack = [];
	}

	replaceResume(resume: Resume) {
		if (!isPlainObject(resume.data)) {
			throw new Error(
				'replaceResume() requires a full Resume object with a `data` property ' +
					'containing the resume content (e.g. `{ data: { name, workExperience, ... } }`).',
			);
		}

		this.snapshot = structuredClone(resume);
		this.undoStack = [];
		this.redoStack = [];
		this.emitSnapshot();
	}

	replaceXml(xml: string) {
		if (!this.snapshot) return;
		this.pushUndoSnapshot();
		this.snapshot = {
			...this.snapshot,
			xml,
			data: resumeContentFromXml(xml, this.snapshot.uid),
		};
		this.emitSnapshot();
	}

	setField(path: string, value: unknown) {
		if (!this.snapshot) {
			return;
		}

		this.pushUndoSnapshot();
		const next = detachChangedBulletReferences(
			this.snapshot,
			cloneWithPathValue(this.snapshot, path, value),
		);
		const currentXml = this.getXml();
		this.snapshot = {
			...next,
			xml: currentXml
				? preserveExtensionMarkup(currentXml, resumeToXml(next))
				: resumeToXml(next),
		};
		this.emitSnapshot();
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, [
			...currentItems,
			createDefaultCollectionItem(collection, this.snapshot),
		]);
		this.emitSnapshot();
	}

	insertCollectionItem(collection: ResumeCollectionValue, index: number) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		const clampedIndex = Math.max(0, Math.min(index, currentItems.length));

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, [
			...currentItems.slice(0, clampedIndex),
			createDefaultCollectionItem(collection, this.snapshot),
			...currentItems.slice(clampedIndex),
		]);
		this.emitSnapshot();
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(
			this.snapshot,
			path,
			currentItems.filter((_, itemIndex) => itemIndex !== index),
		);
		this.emitSnapshot();
	}

	moveArrayItem(path: string, fromIndex: number, toIndex: number) {
		if (!this.snapshot) {
			return;
		}

		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		const nextItems = reorderItems(currentItems, fromIndex, toIndex);

		if (
			nextItems.length === currentItems.length &&
			nextItems.every((item, index) => item === currentItems[index])
		) {
			return;
		}

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, nextItems);
		this.emitSnapshot();
	}

	applyXmlOps(ops: readonly ResumeXmlOp[]) {
		if (!this.snapshot || ops.length === 0) return;
		const currentXml = this.getXml();
		if (!currentXml) return;

		this.pushUndoSnapshot();
		const document = new Y.Doc();
		const fragment = document.getXmlFragment(RESUME_XML_FRAGMENT);
		replaceFragmentXml(fragment, currentXml);
		document.transact(() => applyXmlOpsToFragment(fragment, ops), LOCAL_ORIGIN);
		const xml = serializeFragment(fragment);
		this.snapshot = {
			...this.snapshot,
			xml,
			data: resumeContentFromXml(xml, this.snapshot.uid),
		};
		document.destroy();
		this.options.onSnapshotChange?.(this.snapshot);
	}

	undo() {
		if (!this.snapshot) {
			return;
		}

		const previousSnapshot = this.undoStack.pop();

		if (!previousSnapshot) {
			return;
		}

		this.redoStack.push(structuredClone(this.snapshot));
		this.snapshot = previousSnapshot;
		this.emitSnapshot();
	}

	redo() {
		if (!this.snapshot) {
			return;
		}

		const nextSnapshot = this.redoStack.pop();

		if (!nextSnapshot) {
			return;
		}

		this.undoStack.push(structuredClone(this.snapshot));
		this.snapshot = nextSnapshot;
		this.emitSnapshot();
	}

	protected getValueAtPath(path: string) {
		if (!this.snapshot) {
			return undefined;
		}

		return parsePath(path).reduce<unknown>((current, segment) => {
			if (current == null) {
				return undefined;
			}

			if (typeof segment === 'number' && Array.isArray(current)) {
				return current[segment];
			}

			if (isPlainObject(current)) {
				return current[String(segment)];
			}

			return undefined;
		}, this.snapshot);
	}

	async destroy() {}
}

const LOCAL_ORIGIN = Symbol('resume-editor');
const CONNECT_TIMEOUT_MS = 10_000;

interface CrdtResumeControllerOptions {
	resumeId: string;
	resume: Resume;
	collaborationUrl: string;
	token: string;
	onSnapshotChange?: (resume: Resume | null) => void;
	onError?: (error: Error) => void;
}

/**
 * The editor's authoritative resume state. Every mutation is made directly to
 * the shared Yjs document, so UI edits and agent edits cannot overwrite one
 * another through the legacy GraphQL persistence path.
 */
export class CrdtResumeController implements ResumeDocumentController {
	readonly resumeId: string;
	private readonly doc = new Y.Doc();
	private readonly root = this.doc.getXmlFragment(RESUME_XML_FRAGMENT);
	private readonly undoManager = new Y.UndoManager(this.root, {
		trackedOrigins: new Set([LOCAL_ORIGIN]),
	});
	private readonly provider: HocuspocusProvider;
	private snapshot: Resume | null = null;
	private destroyed = false;

	private constructor(private readonly options: CrdtResumeControllerOptions) {
		this.resumeId = options.resumeId;
		this.provider = new HocuspocusProvider({
			url: options.collaborationUrl,
			name: `resume:${this.resumeId}`,
			document: this.doc,
			token: options.token,
		});
	}

	static async connect(options: CrdtResumeControllerOptions) {
		const controller = new CrdtResumeController(options);

		try {
			await controller.waitForSync();
			controller.root.observeDeep(controller.handleDocumentChange);
			controller.updateSnapshot();
			return controller;
		} catch (error) {
			await controller.destroy();
			throw error;
		}
	}

	getSnapshot() {
		return this.snapshot;
	}

	getXml() {
		return this.root.length > 0 ? serializeFragment(this.root) : null;
	}

	replaceResume(resume: Resume) {
		if (!isPlainObject(resume.data)) {
			throw new Error(
				'replaceResume() requires a full Resume object with a `data` property ' +
					'containing the resume content (e.g. `{ data: { name, workExperience, ... } }`). ' +
					'Passing resume content directly writes it to the top level of the document ' +
					'instead of under `data`, which breaks every reader of the document.',
			);
		}

		this.doc.transact(() => {
			const currentXml = this.getXml();
			const replacementXml = resumeToXml(resume);
			replaceFragmentXml(
				this.root,
				currentXml ? preserveExtensionMarkup(currentXml, replacementXml) : replacementXml,
			);
		}, LOCAL_ORIGIN);
	}

	replaceXml(xml: string) {
		this.doc.transact(() => {
			replaceFragmentXml(this.root, xml);
		}, LOCAL_ORIGIN);
	}

	setField(path: string, value: unknown) {
		if (!this.snapshot) return;
		const next = detachChangedBulletReferences(
			this.snapshot,
			cloneWithPathValue(this.snapshot, path, value),
		);
		this.replaceResume(next);
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		const snapshot = this.getSnapshot();
		if (!snapshot) return;

		const path = getResumeCollectionPath(collection);
		const items = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		this.setField(path, [...items, createDefaultCollectionItem(collection, snapshot)]);
	}

	insertCollectionItem(collection: ResumeCollectionValue, index: number) {
		const snapshot = this.getSnapshot();
		if (!snapshot) return;

		const path = getResumeCollectionPath(collection);
		const items = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		const position = Math.max(0, Math.min(index, items.length));
		this.setField(path, [
			...items.slice(0, position),
			createDefaultCollectionItem(collection, snapshot),
			...items.slice(position),
		]);
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		const path = getResumeCollectionPath(collection);
		const items = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		this.setField(
			path,
			items.filter((_, itemIndex) => itemIndex !== index),
		);
	}

	moveArrayItem(path: string, fromIndex: number, toIndex: number) {
		const items = this.getValueAtPath(path) as unknown[] | undefined;
		if (!items) return;

		const reordered = reorderItems(items, fromIndex, toIndex);
		if (JSON.stringify(items) !== JSON.stringify(reordered)) {
			this.setField(path, reordered);
		}
	}

	applyXmlOps(ops: readonly ResumeXmlOp[]) {
		if (ops.length === 0) return;
		this.doc.transact(() => applyXmlOpsToFragment(this.root, ops), LOCAL_ORIGIN);
	}

	undo() {
		this.undoManager.undo();
	}

	redo() {
		this.undoManager.redo();
	}

	async destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.unobserveDeep(this.handleDocumentChange);
		this.undoManager.destroy();
		this.provider.destroy();
		this.doc.destroy();
	}

	private async waitForSync() {
		if (this.provider.isSynced) {
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				reject(new Error(`Timed out connecting to resume:${this.resumeId}`));
			}, CONNECT_TIMEOUT_MS);
			const complete = (callback: () => void) => {
				window.clearTimeout(timeout);
				callback();
			};

			this.provider.on('synced', () => complete(resolve));
			this.provider.on('authenticationFailed', ({ reason }: { reason: string }) =>
				complete(() => reject(new Error(`CRDT authentication failed: ${reason}`))),
			);
		});
	}

	private readonly handleDocumentChange = () => {
		this.updateSnapshot();
	};

	private updateSnapshot() {
		if (this.root.length === 0) {
			this.snapshot = null;
			this.options.onSnapshotChange?.(null);
			return;
		}

		const xml = serializeFragment(this.root);
		this.snapshot = {
			...this.options.resume,
			_id: this.resumeId,
			id: this.resumeId,
			xml,
			data: resumeContentFromXml(xml, this.options.resume.uid),
		} as Resume;
		this.options.onSnapshotChange?.(this.snapshot);
	}

	private getValueAtPath(path: string) {
		if (!this.snapshot) return undefined;
		return parsePath(path).reduce<unknown>((current, segment) => {
			if (Array.isArray(current) && typeof segment === 'number') return current[segment];
			if (isPlainObject(current)) return current[String(segment)];
			return undefined;
		}, this.snapshot);
	}
}
