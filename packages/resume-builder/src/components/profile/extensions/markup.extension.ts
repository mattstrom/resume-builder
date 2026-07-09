import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		markup: {
			setMarkup: (attributes?: Record<string, string>) => ReturnType;
			unsetMarkup: () => ReturnType;
			toggleMarkup: (attributes?: Record<string, string>) => ReturnType;
		};
	}
}

export interface MarkupOptions {
	HTMLAttributes: Record<string, string>;
}

/**
 * Generic, schema-less markup mark — the inline equivalent of wrapping text
 * in a plain `<span>`. It carries whatever attributes are put on it rather
 * than a fixed set, so it can serve as the foundation for future extensions
 * bound to more specific semantic tags.
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
			attributes: {
				default: {},
				parseHTML: (element) => {
					const attrs: Record<string, string> = {};
					for (const { name, value } of Array.from(element.attributes)) {
						if (name === 'data-markup') {
							continue;
						}

						attrs[name] = value;
					}

					return attrs;
				},
				renderHTML: (markAttrs) => (markAttrs.attributes as Record<string, string>) ?? {},
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
					commands.setMark(this.name, { attributes }),
			unsetMarkup:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
			toggleMarkup:
				(attributes = {}) =>
				({ commands }) =>
					commands.toggleMark(this.name, { attributes }),
		};
	},
});
