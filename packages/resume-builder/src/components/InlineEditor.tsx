import {
	type FC,
	type ReactNode,
	createElement,
} from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';
import { TextFieldEditor } from '@/components/TextFieldEditor.tsx';

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

		const handleClick = () => {
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, value);
			}
		};

		const readContent = children ?? (value || placeholder);

		return (
			<span className="relative inline">
				{createElement(
					Tag,
					{
						className,
						onClick: handleClick,
						style: {
							cursor: isEditable ? 'pointer' : undefined,
							...(isEditing ? { opacity: 0.5 } : {}),
						},
					},
					readContent,
				)}

				{isEditing &&
					(
						<TextFieldEditor
							path={path}
							value={value}
							resumeId={resumeId}
							multiline={multiline}
							placeholder={placeholder}
							autoFocus
							onCommitSuccess={() => store.discard()}
							onCancel={() => store.discard()}
							className="absolute left-0 top-full z-50 mt-1 w-full rounded border border-gray-300 bg-white p-1 text-sm shadow-md"
						/>
					)}
			</span>
		);
	},
);
