import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { cn } from '@/lib/utils';
import { type Editor, useEditorState } from '@tiptap/react';
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListOrdered,
	Minus,
	Quote,
	Redo,
	SquareCode,
	Undo,
} from 'lucide-react';
import type { FC, ReactNode } from 'react';

interface NarrativeToolbarProps {
	editor: Editor | null;
}

export const NarrativeToolbar: FC<NarrativeToolbarProps> = ({ editor }) => {
	// useEditorState re-renders this component on every relevant transaction
	// so active/disabled states stay in sync with the current selection.
	const state = useEditorState({
		editor,
		selector: ({ editor: e }) => {
			if (!e) {
				return null;
			}
			return {
				isBold: e.isActive('bold'),
				isItalic: e.isActive('italic'),
				isCode: e.isActive('code'),
				isH1: e.isActive('heading', { level: 1 }),
				isH2: e.isActive('heading', { level: 2 }),
				isH3: e.isActive('heading', { level: 3 }),
				isBulletList: e.isActive('bulletList'),
				isOrderedList: e.isActive('orderedList'),
				isBlockquote: e.isActive('blockquote'),
				isCodeBlock: e.isActive('codeBlock'),
				canUndo: e.can().chain().undo().run(),
				canRedo: e.can().chain().redo().run(),
			};
		},
	});

	if (!editor || !state) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/30 px-2 py-1">
			<ToolbarButton
				label="Bold"
				active={state.isBold}
				onClick={() => editor.chain().focus().toggleBold().run()}
			>
				<Bold className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Italic"
				active={state.isItalic}
				onClick={() => editor.chain().focus().toggleItalic().run()}
			>
				<Italic className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Inline code"
				active={state.isCode}
				onClick={() => editor.chain().focus().toggleCode().run()}
			>
				<Code className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			<ToolbarButton
				label="Heading 1"
				active={state.isH1}
				onClick={() =>
					editor.chain().focus().toggleHeading({ level: 1 }).run()
				}
			>
				<Heading1 className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Heading 2"
				active={state.isH2}
				onClick={() =>
					editor.chain().focus().toggleHeading({ level: 2 }).run()
				}
			>
				<Heading2 className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Heading 3"
				active={state.isH3}
				onClick={() =>
					editor.chain().focus().toggleHeading({ level: 3 }).run()
				}
			>
				<Heading3 className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			<ToolbarButton
				label="Bullet list"
				active={state.isBulletList}
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			>
				<List className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Ordered list"
				active={state.isOrderedList}
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			>
				<ListOrdered className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Blockquote"
				active={state.isBlockquote}
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
			>
				<Quote className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Code block"
				active={state.isCodeBlock}
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
			>
				<SquareCode className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			<ToolbarButton
				label="Horizontal rule"
				onClick={() => editor.chain().focus().setHorizontalRule().run()}
			>
				<Minus className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			<ToolbarButton
				label="Undo"
				disabled={!state.canUndo}
				onClick={() => editor.chain().focus().undo().run()}
			>
				<Undo className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Redo"
				disabled={!state.canRedo}
				onClick={() => editor.chain().focus().redo().run()}
			>
				<Redo className="size-4" />
			</ToolbarButton>
		</div>
	);
};

interface ToolbarButtonProps {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}

const ToolbarButton: FC<ToolbarButtonProps> = ({
	label,
	active,
	disabled,
	onClick,
	children,
}) => (
	<Button
		type="button"
		variant="ghost"
		size="sm"
		aria-label={label}
		title={label}
		aria-pressed={active}
		disabled={disabled}
		onClick={onClick}
		className={cn(
			'h-8 w-8 p-0',
			active && 'bg-accent text-accent-foreground',
		)}
	>
		{children}
	</Button>
);

const ToolbarSeparator: FC = () => (
	<Separator orientation="vertical" className="mx-1 h-6" />
);
