import { type Editor, useEditorState } from '@tiptap/react';
import { type FC, type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

interface MarkupControlProps {
	editor: Editor;
	trigger: (props: { active: boolean }) => ReactElement;
}

/**
 * Shared by the toolbar and bubble menu: a popover that sets the `data-type`
 * attribute of the generic `markup` mark for the current selection, so a
 * marked-up span can say what it represents (e.g. "company", "skill").
 */
export const MarkupControl: FC<MarkupControlProps> = ({ editor, trigger }) => {
	const [open, setOpen] = useState(false);
	const [type, setType] = useState('');

	const state = useEditorState({
		editor,
		selector: ({ editor: e }) => {
			const attrs = e.getAttributes('markup').attributes as
				| Record<string, string>
				| undefined;
			return {
				isActive: e.isActive('markup'),
				type: attrs?.['data-type'] ?? '',
			};
		},
	});

	useEffect(() => {
		if (open) setType(state?.type ?? '');
	}, [open, state?.type]);

	if (!state) {
		return null;
	}

	const apply = () => {
		const trimmed = type.trim();
		if (trimmed) {
			editor.chain().focus().setMarkup({ 'data-type': trimmed }).run();
		} else {
			editor.chain().focus().unsetMarkup().run();
		}
		setOpen(false);
	};

	const remove = () => {
		editor.chain().focus().unsetMarkup().run();
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{trigger({ active: state.isActive })}</PopoverTrigger>
			<PopoverContent className="w-56 space-y-2 p-3" align="start">
				<label htmlFor="markup-type" className="text-xs font-medium text-muted-foreground">
					Type
				</label>
				<Input
					id="markup-type"
					autoFocus
					value={type}
					placeholder="e.g. company, skill"
					onChange={(e) => setType(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							apply();
						}
					}}
				/>
				<div className="flex justify-end gap-1">
					{state.isActive && (
						<Button type="button" variant="ghost" size="sm" onClick={remove}>
							Remove
						</Button>
					)}
					<Button type="button" size="sm" onClick={apply}>
						Apply
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
};
