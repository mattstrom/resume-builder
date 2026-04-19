import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { formatKey } from '@/lib/format-key.ts';
import { type FC, useState, useEffect } from 'react';

// ─── Primitives ───────────────────────────────────────────────────────────────

const ReadonlyBadgeList: FC<{ items: string[] }> = ({ items }) => (
	<div className="flex flex-wrap gap-1.5">
		{items.map((item, i) => (
			<Badge key={i} variant="secondary" className="text-xs font-normal">
				{item}
			</Badge>
		))}
	</div>
);

const ReadonlyStringValue: FC<{ value: string }> = ({ value }) => (
	<span className="text-sm text-foreground">{value}</span>
);

const ReadonlyPercentage: FC<{ value: number }> = ({ value }) => (
	<span className="text-sm font-medium text-foreground">
		{Math.round(value * 100)}%
	</span>
);

// ─── Polymorphic renderer ─────────────────────────────────────────────────────

const ReadonlyValueRenderer: FC<{ value: unknown }> = ({ value }) => {
	if (Array.isArray(value)) {
		return <ReadonlyBadgeList items={value as string[]} />;
	}
	if (typeof value === 'number') {
		return <ReadonlyPercentage value={value} />;
	}
	return <ReadonlyStringValue value={String(value ?? '')} />;
};

// ─── Full panel ───────────────────────────────────────────────────────────────

interface ReadonlyDataViewProps {
	title: string;
	description?: string;
	data: Record<string, unknown> | null | undefined;
	emptyMessage?: string;
}

export const ReadonlyDataView: FC<ReadonlyDataViewProps> = ({
	title,
	description,
	data,
	emptyMessage = 'No data available.',
}) => {
	const entries = data ? Object.entries(data) : [];
	const [openItems, setOpenItems] = useState<string[]>([]);

	useEffect(() => {
		if (entries.length > 0) {
			setOpenItems(entries.map(([key]) => key));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	return (
		<div className="flex h-full w-full flex-col gap-3 p-6">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">
					{title}
				</h2>
				{description && (
					<p className="text-sm text-muted-foreground">
						{description}
					</p>
				)}
			</div>

			{entries.length > 0 ? (
				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="flex-1 overflow-auto">
						<Accordion
							type="multiple"
							value={openItems}
							onValueChange={setOpenItems}
							className="flex flex-col gap-1"
						>
							{entries.map(([key, value]) => (
								<AccordionItem
									key={key}
									value={key}
									className="rounded-md border border-border px-3"
								>
									<AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
										{formatKey(key)}
									</AccordionTrigger>
									<AccordionContent className="pb-3">
										<ReadonlyValueRenderer value={value} />
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</div>
			) : (
				<div className="flex flex-1 items-center justify-center rounded-md border border-input bg-background text-sm text-muted-foreground shadow-sm">
					{emptyMessage}
				</div>
			)}
		</div>
	);
};
