import * as Y from 'yjs';

export type JsonPatchOp =
	| { op: 'set'; path: string; value: unknown }
	| { op: 'delete'; path: string }
	| { op: 'insert'; path: string; index: number; value: unknown }
	| { op: 'remove'; path: string; index: number };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Convert a plain JS value into a Yjs-native value, mirroring the conversion
 * logic in packages/crdt/src/modules/storage/storage.service.ts so that the
 * document shape stays compatible with the rest of the system.
 */
export function toYValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const array = new Y.Array<unknown>();
		array.insert(
			0,
			value.map((entry) => toYValue(entry)),
		);
		return array;
	}

	if (isPlainObject(value)) {
		const map = new Y.Map<unknown>();
		for (const [key, entry] of Object.entries(value)) {
			map.set(key, toYValue(entry));
		}
		return map;
	}

	if (value === undefined) {
		return null;
	}

	return value;
}

/** Read a Yjs root (or any nested Y node) back out as a plain JS value. */
export function fromYValue(value: unknown): unknown {
	if (value instanceof Y.Map) {
		const object: Record<string, unknown> = {};
		for (const [key, entry] of value.entries()) {
			object[key] = fromYValue(entry);
		}
		return object;
	}

	if (value instanceof Y.Array) {
		return value.toArray().map((entry) => fromYValue(entry));
	}

	return value;
}

/**
 * Split a dotted or slash-separated path into segments. Numeric segments stay
 * as strings; callers coerce to index when they know the container is a
 * Y.Array.
 */
function splitPath(path: string): string[] {
	if (!path) return [];
	const normalized = path.startsWith('/') ? path.slice(1) : path;
	return normalized.split(/[./]/).filter((s) => s.length > 0);
}

type Container = Y.Map<unknown> | Y.Array<unknown>;

function getChild(container: Container, segment: string): unknown {
	if (container instanceof Y.Array) {
		const index = Number(segment);
		if (!Number.isInteger(index)) {
			throw new Error(
				`Expected numeric index for array segment, got "${segment}"`,
			);
		}
		return container.get(index);
	}
	return container.get(segment);
}

/**
 * Walk from root to the parent of the final segment, returning `{ parent,
 * lastSegment }`. If `createMissing` is true, missing intermediate Y.Map
 * entries are created along the way (only meaningful for `set`).
 */
function walkToParent(
	root: Y.Map<unknown>,
	segments: string[],
	createMissing: boolean,
): { parent: Container; lastSegment: string } {
	if (segments.length === 0) {
		throw new Error('Cannot operate on empty path (use root-level ops)');
	}

	let current: Container = root;

	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		let next = getChild(current, segment);

		if (next === undefined || next === null) {
			if (!createMissing) {
				throw new Error(
					`Path segment "${segment}" not found at index ${i}`,
				);
			}
			if (current instanceof Y.Array) {
				throw new Error(
					`Cannot auto-create children inside a Y.Array at segment "${segment}"`,
				);
			}
			const child = new Y.Map<unknown>();
			current.set(segment, child);
			next = child;
		}

		if (!(next instanceof Y.Map) && !(next instanceof Y.Array)) {
			throw new Error(
				`Path segment "${segment}" is a leaf value, not a container`,
			);
		}

		current = next;
	}

	return { parent: current, lastSegment: segments[segments.length - 1] };
}

/**
 * Apply a list of patch ops to a Y.Map root. Callers MUST wrap this in
 * `doc.transact(...)` so that all ops land in a single Y update.
 */
export function applyJsonPatch(root: Y.Map<unknown>, ops: JsonPatchOp[]): void {
	for (const op of ops) {
		const segments = splitPath(op.path);

		// Root-level set replaces the whole root map contents.
		if (op.op === 'set' && segments.length === 0) {
			if (!isPlainObject(op.value)) {
				throw new Error('Root-level set requires a plain object value');
			}
			for (const key of [...root.keys()]) {
				root.delete(key);
			}
			for (const [key, entry] of Object.entries(op.value)) {
				root.set(key, toYValue(entry));
			}
			continue;
		}

		const { parent, lastSegment } = walkToParent(
			root,
			segments,
			op.op === 'set',
		);

		switch (op.op) {
			case 'set': {
				if (parent instanceof Y.Array) {
					const index = Number(lastSegment);
					if (!Number.isInteger(index)) {
						throw new Error(
							`Expected numeric index for array set, got "${lastSegment}"`,
						);
					}
					// Y.Array has no set(); replace via delete+insert.
					if (index < parent.length) {
						parent.delete(index, 1);
					}
					parent.insert(index, [toYValue(op.value)]);
				} else {
					parent.set(lastSegment, toYValue(op.value));
				}
				break;
			}
			case 'delete': {
				if (parent instanceof Y.Array) {
					const index = Number(lastSegment);
					if (!Number.isInteger(index)) {
						throw new Error(
							`Expected numeric index for array delete, got "${lastSegment}"`,
						);
					}
					parent.delete(index, 1);
				} else {
					parent.delete(lastSegment);
				}
				break;
			}
			case 'insert': {
				const target = getChild(parent, lastSegment);
				if (!(target instanceof Y.Array)) {
					throw new Error(
						`insert target at "${op.path}" is not a Y.Array`,
					);
				}
				target.insert(op.index, [toYValue(op.value)]);
				break;
			}
			case 'remove': {
				const target = getChild(parent, lastSegment);
				if (!(target instanceof Y.Array)) {
					throw new Error(
						`remove target at "${op.path}" is not a Y.Array`,
					);
				}
				target.delete(op.index, 1);
				break;
			}
		}
	}
}
