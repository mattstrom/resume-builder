import clsx from 'clsx';
import { observer } from 'mobx-react';
import { type FC, type MouseEvent, type ReactNode, createElement } from 'react';

import {
	InlineMarkdown,
	LinkMarkupHint,
} from '@/components/InlineMarkdown.tsx';
import { ResumeLink } from '@/components/ResumeLink.tsx';
import { TextFieldEditor } from '@/components/TextFieldEditor.tsx';
import { useInspectRegion } from '@/hooks/useInspectRegion.ts';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

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
	/** Render Markdown-style links while the field is not being edited. */
	linkMarkup?: boolean;
	/** Render the displayed value as a link to this target. */
	href?: string;
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
		linkMarkup = false,
		href,
	}) => {
		const {
			inlineEditStore: store,
			inspectStore,
			uiStateStore,
		} = useStore();
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;
		const { isInspectMode, isHovered, isSelected, handlers } =
			useInspectRegion(path, pathToLabel(path));
		const isConceptEvidence =
			inspectStore.isConceptEvidenceHighlighted(path);

		const handleClick = (e: MouseEvent) => {
			if (isInspectMode) {
				handlers.onClick(e);
				return;
			}
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, value);
			}
		};

		const beginEdit = () => store.beginEdit(resumeId, path, value);
		const fallbackContent = value || placeholder;
		const renderedContent = linkMarkup ? (
			<InlineMarkdown
				value={value}
				isEditable={isEditable}
				onEditRequest={beginEdit}
			/>
		) : (
			(children ?? fallbackContent)
		);
		const readContent = href ? (
			<ResumeLink
				href={href}
				isEditable={isEditable}
				onEditRequest={beginEdit}
			>
				{renderedContent}
			</ResumeLink>
		) : (
			renderedContent
		);

		return (
			<span
				className={cn(
					'relative',
					multiline ? 'block w-full' : 'inline',
				)}
				data-path={path}
			>
				{createElement(
					Tag,
					{
						className: clsx(
							className,
							isConceptEvidence
								? 'outline outline-2 outline-info outline-offset-1 bg-info/10'
								: isSelected &&
										'outline outline-2 outline-blue-500 outline-offset-1',
							isHovered &&
								!isConceptEvidence &&
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
					<>
						<TextFieldEditor
							path={path}
							value={value}
							resumeId={resumeId}
							multiline={multiline}
							placeholder={placeholder}
							autoFocus
							onCommitSuccess={() => store.discard()}
							onCancel={() => store.discard()}
							className={cn(
								'z-50 rounded border border-border bg-white p-1 text-sm text-zinc-900 shadow-md placeholder:text-zinc-400',
								multiline
									? 'absolute -top-1 left-0 h-[calc(100%+0.5rem)] w-full resize-none'
									: 'absolute left-0 top-full mt-1 w-full',
							)}
						/>
						{linkMarkup && (
							<span className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded bg-popover px-2 py-1 shadow-sm">
								<LinkMarkupHint />
							</span>
						)}
					</>
				)}
			</span>
		);
	},
);
