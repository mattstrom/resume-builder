import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { observer } from 'mobx-react';
import { type ReactNode, createElement, useMemo, useState } from 'react';

interface LookupFieldEditorProps<TValue, TOption> {
	path: string;
	value: TValue;
	resumeId: string;
	options: TOption[];
	as?: keyof JSX.IntrinsicElements;
	className?: string;
	placeholder?: string;
	getOptionKey: (option: TOption) => string;
	renderDisplay: (value: TValue) => ReactNode;
	renderOption: (option: TOption) => ReactNode;
	mapOptionToValue: (option: TOption, currentValue: TValue) => TValue;
}

const LookupFieldEditorComponent = <TValue, TOption>({
	path,
	value,
	resumeId,
	options,
	as: Tag = 'div',
	className,
	placeholder = 'Select an option',
	getOptionKey,
	renderDisplay,
	renderOption,
	mapOptionToValue,
}: LookupFieldEditorProps<TValue, TOption>) => {
	const { uiStateStore } = useStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const isEditable = uiStateStore.isResumeEditable;

	const optionMap = useMemo(
		() => new Map(options.map((option) => [getOptionKey(option), option])),
		[options, getOptionKey],
	);

	const beginEdit = () => {
		if (isEditable && !isSaving) {
			setIsEditing(true);
		}
	};

	const save = async (optionKey: string) => {
		const selectedOption = optionMap.get(optionKey);

		if (!selectedOption) {
			return;
		}

		setIsSaving(true);

		try {
			getActiveResumeController(resumeId)?.setField(
				path,
				mapOptionToValue(selectedOption, value),
			);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	if (isEditable && isEditing) {
		return createElement(
			Tag,
			{ className },
			<Select onValueChange={(optionKey) => void save(optionKey)}>
				<SelectTrigger disabled={isSaving}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => {
						const optionKey = getOptionKey(option);

						return (
							<SelectItem key={optionKey} value={optionKey}>
								{renderOption(option)}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>,
		);
	}

	return createElement(
		Tag,
		{
			className,
			onClick: beginEdit,
			style: { cursor: isEditable ? 'pointer' : undefined },
		},
		renderDisplay(value),
	);
};

export const LookupFieldEditor = observer(LookupFieldEditorComponent);
