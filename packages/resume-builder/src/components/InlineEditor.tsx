import {
	type FC,
	type KeyboardEvent,
	type ReactNode,
	createElement,
	useEffect,
	useRef,
} from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';

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
	}) => {
		const { inlineEditStore: store, uiStateStore } = useStore();
		const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;

		useEffect(() => {
			if (isEditing) {
				inputRef.current?.focus();
			}
		}, [isEditing]);

		const handleClick = () => {
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, value);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				store.discard();
			} else if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
				e.preventDefault();
				store.commit();
			}
		};

		const readContent = children ?? value;

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
					(multiline ? (
						<textarea
							ref={
								inputRef as React.RefObject<HTMLTextAreaElement>
							}
							className="absolute left-0 top-full z-50 mt-1 w-full rounded border border-gray-300 bg-white p-1 text-sm shadow-md"
							value={store.editValue}
							onChange={(e) => store.updateValue(e.target.value)}
							onKeyDown={handleKeyDown}
							rows={3}
						/>
					) : (
						<input
							ref={inputRef as React.RefObject<HTMLInputElement>}
							type="text"
							className="absolute left-0 top-full z-50 mt-1 w-full rounded border border-gray-300 bg-white p-1 text-sm shadow-md"
							value={store.editValue}
							onChange={(e) => store.updateValue(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					))}
			</span>
		);
	},
);
