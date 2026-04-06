import { type FC, type KeyboardEvent, useEffect, useState } from 'react';
import { useStore } from '@/stores/store.provider.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';

interface TextFieldEditorProps {
	path: string;
	value: string;
	resumeId: string;
	multiline?: boolean;
	className?: string;
	placeholder?: string;
	autoFocus?: boolean;
	onCommitSuccess?: () => void;
	onCancel?: () => void;
}

export const TextFieldEditor: FC<TextFieldEditorProps> = ({
	path,
	value,
	resumeId,
	multiline = false,
	className,
	placeholder,
	autoFocus = false,
	onCommitSuccess,
	onCancel,
}) => {
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const [draft, setDraft] = useState(value);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!autoFocus) {
			setDraft(value);
		}
	}, [autoFocus, value]);

	const commit = async () => {
		if (!isEditable || isSaving) {
			return;
		}

		if (draft === value) {
			onCommitSuccess?.();
			return;
		}

		setIsSaving(true);

		try {
			getActiveResumeController(resumeId)?.setField(path, draft);
			onCommitSuccess?.();
		} finally {
			setIsSaving(false);
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			setDraft(value);
			onCancel?.();
		} else if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
			e.preventDefault();
			void commit();
		}
	};

	if (multiline) {
		return (
			<textarea
				className={className}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => void commit()}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				rows={3}
				readOnly={!isEditable || isSaving}
				autoFocus={autoFocus}
			/>
		);
	}

	return (
		<input
			type="text"
			className={className}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={() => void commit()}
			onKeyDown={handleKeyDown}
			placeholder={placeholder}
			readOnly={!isEditable || isSaving}
			autoFocus={autoFocus}
		/>
	);
};
