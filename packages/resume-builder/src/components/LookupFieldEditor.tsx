import { SET_RESUME_FIELD } from '@/graphql/mutations.ts';
import { LIST_RESUMES } from '@/graphql/queries.ts';
import type {
	SetResumeFieldData,
	SetResumeFieldVariables,
} from '@/graphql/types.ts';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { useStore } from '@/stores/store.provider.tsx';
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

export const LookupFieldEditor = <TValue, TOption>({
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
	const { client } = useStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const optionMap = useMemo(
		() =>
			new Map(options.map((option) => [getOptionKey(option), option])),
		[options, getOptionKey],
	);

	const beginEdit = () => {
		if (!isSaving) {
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
			await client.mutate<SetResumeFieldData, SetResumeFieldVariables>({
				mutation: SET_RESUME_FIELD,
				variables: {
					id: resumeId,
					input: { path },
					value: mapOptionToValue(selectedOption, value),
				},
				refetchQueries: [{ query: LIST_RESUMES }],
			});
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	if (isEditing) {
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
			style: { cursor: 'pointer' },
		},
		renderDisplay(value),
	);
};
