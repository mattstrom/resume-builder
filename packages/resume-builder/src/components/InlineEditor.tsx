import clsx from 'clsx';
import { type FC, type MouseEvent, type ReactNode, createElement } from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';
import { TextFieldEditor } from '@/components/TextFieldEditor.tsx';
import { cn } from '@/lib/utils.ts';
import { useInspectRegion } from '@/hooks/useInspectRegion.ts';

function pathToLabel(path: string): string {
	const segment = path.split('.').findLast((s) => !/^\d+$/.test(s)) ?? path;
	return segment
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (s) => s.toUpperCase());
}

interface InlineEditorProps {
	/** Dot-notation path, e.g. "data.workExperience.0.company" */
	path: string;
	/** Current display value */
	value: string;
	/** Resume _id */
	resumeId: string;
	/** Render as textarea for multiline content */
	multiline?: boolean;
	/** HTML element for the read-mode wrapper */
	as?: keyof JSX.IntrinsicElements;
	/** className for the read-mode wrapper */
	className?: string;
	/** Custom read-mode rendering (defaults to value as text) */
	children?: ReactNode;
	/** Placeholder shown when the current value is empty */
	placeholder?: string;
}

export const InlineEditor: FC<InlineEditorProps> = observer(
	({
		path,
		value,
		resumeId,
		multiline = false,
		as: Tag = 'span',
		className,
		children,
		placeholder,
	}) => {
		const { inlineEditStore: store, uiStateStore } = useStore();
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;
		const { isInspectMode, isHovered, isSelected, handlers } =
			useInspectRegion(path, pathToLabel(path));

		const handleClick = (e: MouseEvent) => {
			if (isInspectMode) {
				handlers.onClick(e);
				return;
			}
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, value);
			}
		};

		const readContent = children ?? (value || placeholder);

		return (
			<span className={cn('relative inline')} data-path={path}>
				{createElement(
					Tag,
					{
						className: clsx(
							className,
							isSelected &&
								'outline outline-2 outline-blue-500 outline-offset-1',
							isHovered &&
								!isSelected &&
								'outline outline-2 outline-blue-400/70 outline-offset-1',
						),
						onClick: handleClick,
						style: {
							cursor:
								isInspectMode || isEditable
									? 'pointer'
									: undefined,
							...(isEditing ? { opacity: 0.5 } : {}),
						},
						...(isInspectMode && {
							onMouseEnter: handlers.onMouseEnter,
							onMouseLeave: handlers.onMouseLeave,
						}),
					},
					readContent,
				)}

				{isEditing && (
					<TextFieldEditor
						path={path}
						value={value}
						resumeId={resumeId}
						multiline={multiline}
						placeholder={placeholder}
						autoFocus
						onCommitSuccess={() => store.discard()}
						onCancel={() => store.discard()}
						className="absolute left-0 top-full z-50 mt-1 w-full rounded border border-border bg-popover text-popover-foreground p-1 text-sm shadow-md"
					/>
				)}
			</span>
		);
	},
);
