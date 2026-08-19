import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils.ts';

import type { EditorBlock } from './types.ts';

function insertPlainText(event: ClipboardEvent<HTMLElement>) {
	event.preventDefault();
	const selection = window.getSelection();
	if (!selection?.rangeCount) return;

	const range = selection.getRangeAt(0);
	range.deleteContents();
	const node = document.createTextNode(event.clipboardData.getData('text/plain'));
	range.insertNode(node);
	range.setStartAfter(node);
	range.collapse(true);
	selection.removeAllRanges();
	selection.addRange(range);
}

interface EditableBlockTextProps {
	block: EditorBlock;
	onCommit: (value: string) => void;
	className?: string;
	multiline?: boolean;
	singleLine?: boolean;
}

export function EditableBlockText({
	block,
	onCommit,
	className,
	multiline = false,
	singleLine = false,
}: EditableBlockTextProps) {
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const editor = editorRef.current;
		if (editor && document.activeElement !== editor && editor.textContent !== block.text) {
			editor.textContent = block.text;
		}
	}, [block.text]);

	const commit = () => {
		const value = editorRef.current?.textContent ?? '';
		if (value !== block.text) onCommit(value);
	};
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			if (editorRef.current) editorRef.current.textContent = block.text;
			editorRef.current?.blur();
			return;
		}
		if (event.key === 'Enter' && singleLine && !event.shiftKey) {
			event.preventDefault();
			commit();
			editorRef.current?.blur();
		}
	};

	return (
		<div
			ref={editorRef}
			role="textbox"
			aria-label={block.ariaLabel}
			aria-multiline={multiline}
			contentEditable={!block.readOnly}
			suppressContentEditableWarning
			data-placeholder={block.placeholder}
			className={cn(
				'min-h-7 min-w-0 flex-1 whitespace-pre-wrap rounded-sm px-1 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
				block.readOnly && 'cursor-default',
				className,
			)}
			onBlur={commit}
			onKeyDown={handleKeyDown}
			onPaste={insertPlainText}
		>
			{block.text}
		</div>
	);
}
