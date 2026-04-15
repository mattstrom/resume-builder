import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils';
import { type Editor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Code, Italic } from 'lucide-react';
import type { FC } from 'react';

interface NarrativeBubbleMenuProps {
	editor: Editor | null;
}

export const NarrativeBubbleMenu: FC<NarrativeBubbleMenuProps> = ({
	editor,
}) => {
	const state = useEditorState({
		editor,
		selector: ({ editor: e }) =>
			e
				? {
						isBold: e.isActive('bold'),
						isItalic: e.isActive('italic'),
						isCode: e.isActive('code'),
					}
				: null,
	});

	if (!editor || !state) {
		return null;
	}

	return (
		<BubbleMenu
			editor={editor}
			className="flex items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-md"
		>
			<BubbleButton
				label="Bold"
				active={state.isBold}
				onClick={() => editor.chain().focus().toggleBold().run()}
			>
				<Bold className="size-4" />
			</BubbleButton>
			<BubbleButton
				label="Italic"
				active={state.isItalic}
				onClick={() => editor.chain().focus().toggleItalic().run()}
			>
				<Italic className="size-4" />
			</BubbleButton>
			<BubbleButton
				label="Inline code"
				active={state.isCode}
				onClick={() => editor.chain().focus().toggleCode().run()}
			>
				<Code className="size-4" />
			</BubbleButton>
		</BubbleMenu>
	);
};

interface BubbleButtonProps {
	label: string;
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

const BubbleButton: FC<BubbleButtonProps> = ({
	label,
	active,
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
		onClick={onClick}
		className={cn(
			'h-8 w-8 p-0',
			active && 'bg-accent text-accent-foreground',
		)}
	>
		{children}
	</Button>
);
