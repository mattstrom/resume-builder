import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		markup: {
			setMarkup: (attributes?: { 'data-type'?: string | null }) => ReturnType;
			unsetMarkup: () => ReturnType;
			toggleMarkup: (attributes?: { 'data-type'?: string | null }) => ReturnType;
		};
	}
}

export interface MarkupOptions {
	HTMLAttributes: Record<string, string>;
}

/**
 * Generic markup mark — the inline equivalent of wrapping text in a plain
 * `<span>`, so it can serve as the foundation for future extensions bound to
 * more specific semantic tags.
 *
 * Attributes must stay flat (one ProseMirror attr per HTML attr, primitive
 * values only): the crdt storage service mirrors this document as raw XML
 * via Yjs's own `Y.XmlFragment.toString()`, which stringifies each mark
 * attribute with a plain template literal and can't expand a nested object.
 */
export const Markup = Mark.create<MarkupOptions>({
	name: 'markup',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			'data-type': {
				default: null,
				parseHTML: (element) => element.getAttribute('data-type'),
				renderHTML: (markAttrs) => {
					const type = markAttrs['data-type'] as string | null;
					return type ? { 'data-type': type } : {};
				},
			},
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-markup]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes({ 'data-markup': '' }, this.options.HTMLAttributes, HTMLAttributes),
			0,
		];
	},

	addCommands() {
		return {
			setMarkup:
				(attributes = {}) =>
				({ commands }) =>
					commands.setMark(this.name, attributes),
			unsetMarkup:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
			toggleMarkup:
				(attributes = {}) =>
				({ commands }) =>
					commands.toggleMark(this.name, attributes),
		};
	},
});
