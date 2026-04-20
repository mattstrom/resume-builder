import { Node, mergeAttributes } from '@tiptap/core';
import type { NodeViewProps } from '@tiptap/react';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from '@tiptap/react';
import { type FC, useRef } from 'react';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		details: {
			setDetails: () => ReturnType;
		};
	}
}

const DetailsView: FC<NodeViewProps> = ({ node, updateAttributes }) => {
	const detailsRef = useRef<HTMLDetailsElement>(null);

	return (
		<NodeViewWrapper>
			<details ref={detailsRef} open>
				<summary
					onClick={(e) => {
						// Let clicks on the input through without toggling.
						if ((e.target as HTMLElement).closest('input')) return;
						e.preventDefault();
						const el = detailsRef.current;
						if (el) el.open = !el.open;
					}}
				>
					<input
						type="text"
						value={(node.attrs.summary as string) ?? ''}
						onChange={(e) =>
							updateAttributes({ summary: e.target.value })
						}
						placeholder="Summary"
						className="details-summary-input"
					/>
				</summary>
				<NodeViewContent as="div" className="details-content" />
			</details>
		</NodeViewWrapper>
	);
};

export const Details = Node.create({
	name: 'details',
	group: 'block',
	content: 'block+',
	defining: true,

	addAttributes() {
		return {
			summary: {
				default: 'Summary',
				parseHTML: (element) =>
					element.querySelector('summary')?.textContent?.trim() ??
					'Summary',
			},
		};
	},

	parseHTML() {
		return [{ tag: 'details' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'details',
			mergeAttributes(HTMLAttributes),
			['summary', {}, (node.attrs.summary as string) || 'Summary'],
			['div', { class: 'details-content' }, 0],
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(DetailsView);
	},

	addCommands() {
		return {
			setDetails:
				() =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { summary: 'Summary' },
						content: [{ type: 'paragraph' }],
					}),
		};
	},
});
