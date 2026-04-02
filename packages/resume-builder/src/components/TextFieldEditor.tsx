import {
	type FC,
	type KeyboardEvent,
	useEffect,
	useRef,
} from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';

interface TextFieldEditorProps {
	path: string;
	value: string;
	resumeId: string;
	multiline?: boolean;
	className?: string;
	placeholder?: string;
	autoFocus?: boolean;
}

export const TextFieldEditor: FC<TextFieldEditorProps> = observer(
	({
		path,
		value,
		resumeId,
		multiline = false,
		className,
		placeholder,
		autoFocus = false,
	}) => {
		const { inlineEditStore: store, uiStateStore } = useStore();
		const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;
		const inputValue = isEditing ? store.editValue : value;

		useEffect(() => {
			if (autoFocus && isEditing) {
				inputRef.current?.focus();
			}
		}, [autoFocus, isEditing]);

		const beginEdit = () => {
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, value);
			}
		};

		const handleFocus = () => {
			beginEdit();
		};

		const handleChange = (nextValue: string) => {
			if (!isEditing) {
				store.beginEdit(resumeId, path, value);
			}

			store.updateValue(nextValue);
		};

		const handleBlur = () => {
			if (isEditing) {
				void store.commit();
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				store.discard();
			} else if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
				e.preventDefault();
				void store.commit();
			}
		};

		if (multiline) {
			return (
				<textarea
					ref={inputRef as React.RefObject<HTMLTextAreaElement>}
					className={className}
					value={inputValue}
					onFocus={handleFocus}
					onChange={(e) => handleChange(e.target.value)}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					rows={3}
					readOnly={!isEditable}
				/>
			);
		}

		return (
			<input
				ref={inputRef as React.RefObject<HTMLInputElement>}
				type="text"
				className={className}
				value={inputValue}
				onFocus={handleFocus}
				onChange={(e) => handleChange(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				readOnly={!isEditable}
			/>
		);
	},
);
