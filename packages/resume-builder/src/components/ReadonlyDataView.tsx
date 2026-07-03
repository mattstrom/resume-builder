import { type FC } from 'react';

import { formatKey } from '@/lib/format-key.ts';

// ─── Primitives ───────────────────────────────────────────────────────────────

const ReadonlyStringList: FC<{ items: string[] }> = ({ items }) => (
	<ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-foreground">
		{items.map((item, i) => (
			<li key={i}>{item}</li>
		))}
	</ul>
);

const ReadonlyStringValue: FC<{ value: string }> = ({ value }) => (
	<span className="text-sm text-foreground">{value}</span>
);

const ReadonlyPercentage: FC<{ value: number }> = ({ value }) => (
	<span className="text-sm font-medium text-foreground">{Math.round(value * 100)}%</span>
);

// ─── Polymorphic renderer ─────────────────────────────────────────────────────

const ReadonlyValueRenderer: FC<{ value: unknown }> = ({ value }) => {
	if (Array.isArray(value)) {
		return <ReadonlyStringList items={value as string[]} />;
	}
	if (typeof value === 'number') {
		return <ReadonlyPercentage value={value} />;
	}
	return <ReadonlyStringValue value={String(value ?? '')} />;
};

const readonlyInternalKeys = ['__typename'];

// ─── Full panel ───────────────────────────────────────────────────────────────

interface ReadonlyDataViewProps {
	title: string;
	description?: string;
	data: Record<string, unknown> | null | undefined;
	emptyMessage?: string;
}

interface ReadonlyDataFieldsProps {
	data: Record<string, unknown> | null | undefined;
	emptyMessage?: string;
	className?: string;
	omitKeys?: string[];
}

export const ReadonlyDataFields: FC<ReadonlyDataFieldsProps> = ({
	data,
	emptyMessage = 'No data available.',
	className,
	omitKeys = [],
}) => {
	const entries = data
		? Object.entries(data).filter(
				([key]) => !readonlyInternalKeys.includes(key) && !omitKeys.includes(key),
			)
		: [];

	return entries.length > 0 ? (
		<div className={className ?? 'grid gap-3'}>
			{entries.map(([key, value]) => (
				<div
					key={key}
					className="flex flex-col gap-1 rounded-md border border-border px-3 py-2"
				>
					<span className="text-sm text-muted-foreground">{formatKey(key)}</span>
					<ReadonlyValueRenderer value={value} />
				</div>
			))}
		</div>
	) : (
		<div className="flex min-h-32 items-center justify-center rounded-md border border-input bg-background px-3 py-6 text-sm text-muted-foreground shadow-sm">
			{emptyMessage}
		</div>
	);
};

export const ReadonlyDataView: FC<ReadonlyDataViewProps> = ({
	title,
	description,
	data,
	emptyMessage = 'No data available.',
}) => {
	return (
		<div className="flex h-full w-full flex-col gap-3 p-6">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">{title}</h2>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</div>
			<ReadonlyDataFields
				data={data}
				emptyMessage={emptyMessage}
				className="grid flex-1 gap-3 overflow-auto"
			/>
		</div>
	);
};
