import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { Plus, Trash2, X } from 'lucide-react';
import { observer } from 'mobx-react';
import {
	type FC,
	type KeyboardEvent,
	useEffect,
	useReducer,
	useRef,
	useState,
} from 'react';
import * as Y from 'yjs';
import { formatKey } from '@/lib/format-key.ts';

// ─── Seed skeleton (matches scratch/preferences.yaml) ───────────────────────

const SKELETON: Record<string, unknown> = {
	target_level: '',
	location: {
		preferred: '',
		acceptable_hybrid: [],
		unacceptable: [],
	},
	compensation: {
		target_range: '',
		acceptable_floor: '',
		structure: '',
		note: '',
	},
	company: {
		preferred_stage: '',
		preferred_domains: [],
		aspirational_domains: [],
		less_excited_industries: [],
		avoid: [],
		notes: [],
		culture: '',
	},
	employment: {
		type: '',
	},
	career_trajectory: {
		current: '',
		long_term: '',
		notes: [],
	},
};

// ─── Y.js helpers ────────────────────────────────────────────────────────────

function toYValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const arr = new Y.Array<unknown>();
		arr.insert(0, value.map(toYValue));
		return arr;
	}
	if (value !== null && typeof value === 'object') {
		const map = new Y.Map<unknown>();
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			map.set(k, toYValue(v));
		}
		return map;
	}
	return value ?? null;
}

function seedMap(map: Y.Map<unknown>, values: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(values)) {
		map.set(key, toYValue(value));
	}
}

// ─── Reactive Y.Map hook ─────────────────────────────────────────────────────

function useYMapDeep(map: Y.Map<unknown> | null) {
	const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
	useEffect(() => {
		if (!map) return;
		map.observeDeep(forceUpdate);
		return () => map.unobserveDeep(forceUpdate);
	}, [map]);
}

// ─── Field editors ────────────────────────────────────────────────────────────

interface StringFieldProps {
	value: string;
	onChange: (v: string) => void;
}

const StringField: FC<StringFieldProps> = ({ value, onChange }) => {
	const [draft, setDraft] = useState(value);
	// Sync external (CRDT) changes into draft when not focused
	const focused = useRef(false);
	useEffect(() => {
		if (!focused.current) setDraft(value);
	}, [value]);

	return (
		<Input
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onFocus={() => {
				focused.current = true;
			}}
			onBlur={() => {
				focused.current = false;
				if (draft !== value) onChange(draft);
			}}
			onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
				if (e.key === 'Enter') {
					focused.current = false;
					if (draft !== value) onChange(draft);
					(e.target as HTMLInputElement).blur();
				}
			}}
			className="h-7 text-sm"
		/>
	);
};

interface ArrayFieldProps {
	arr: Y.Array<unknown>;
}

const ArrayField: FC<ArrayFieldProps> = ({ arr }) => {
	const [newItem, setNewItem] = useState('');
	const items = arr.toArray() as string[];

	const addItem = () => {
		const trimmed = newItem.trim();
		if (!trimmed) return;
		arr.push([trimmed]);
		setNewItem('');
	};

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-wrap gap-1.5">
				{items.map((item, i) => (
					<Badge
						key={i}
						variant="secondary"
						className="gap-1 pr-1 text-xs font-normal"
					>
						{item}
						<button
							onClick={() => arr.delete(i, 1)}
							className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
			</div>
			<div className="flex gap-1.5">
				<Input
					value={newItem}
					onChange={(e) => setNewItem(e.target.value)}
					onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
						if (e.key === 'Enter') addItem();
					}}
					placeholder="Add item…"
					className="h-7 flex-1 text-xs"
				/>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2"
					onClick={addItem}
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
};

// ─── Recursive section renderer ───────────────────────────────────────────────

interface SectionContentProps {
	map: Y.Map<unknown>;
}

const SectionContent: FC<SectionContentProps> = ({ map }) => {
	const [newKey, setNewKey] = useState('');
	const entries = Array.from(map.entries());

	const addField = () => {
		const key = newKey.trim();
		if (!key || map.has(key)) return;
		map.set(key, '');
		setNewKey('');
	};

	return (
		<div className="flex flex-col gap-3">
			{entries.map(([key, value]) => (
				<div key={key} className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{formatKey(key)}
						</span>
						<button
							onClick={() => map.delete(key)}
							className="opacity-40 hover:opacity-80 transition-opacity"
						>
							<Trash2 className="h-3 w-3" />
						</button>
					</div>
					<ValueRenderer
						value={value}
						onChange={(v) => map.set(key, v)}
					/>
				</div>
			))}
			<div className="flex gap-1.5 pt-1 border-t border-dashed border-border">
				<Input
					value={newKey}
					onChange={(e) => setNewKey(e.target.value)}
					onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
						if (e.key === 'Enter') addField();
					}}
					placeholder="New field name…"
					className="h-7 flex-1 text-xs"
				/>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2"
					onClick={addField}
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
};

interface ValueRendererProps {
	value: unknown;
	onChange: (v: unknown) => void;
}

const ValueRenderer: FC<ValueRendererProps> = ({ value, onChange }) => {
	if (value instanceof Y.Map) {
		return <SectionContent map={value} />;
	}
	if (value instanceof Y.Array) {
		return <ArrayField arr={value} />;
	}
	return <StringField value={String(value ?? '')} onChange={onChange} />;
};

// ─── Main editor ──────────────────────────────────────────────────────────────

export const JobPreferencesEditor: FC = observer(() => {
	const { profileStore } = useStore();
	const [newSection, setNewSection] = useState('');
	const [openSections, setOpenSections] = useState<string[]>([]);

	useEffect(() => {
		void profileStore.connect();
		return () => profileStore.disconnect();
	}, [profileStore]);

	const { jobPreferencesMap, isSynced, doc } = profileStore;

	useYMapDeep(jobPreferencesMap);

	// Seed skeleton on first sync when document is empty
	useEffect(() => {
		if (!isSynced || !jobPreferencesMap || !doc) return;
		if (jobPreferencesMap.size > 0) return;
		doc.transact(() => seedMap(jobPreferencesMap, SKELETON));
	}, [isSynced, jobPreferencesMap, doc]);

	// Auto-open sections as they appear (seeding or user-added)
	const mapSize = jobPreferencesMap?.size ?? 0;
	useEffect(() => {
		if (!jobPreferencesMap || mapSize === 0) return;
		const keys = Array.from(jobPreferencesMap.keys());
		setOpenSections((prev) => {
			const newKeys = keys.filter((k) => !prev.includes(k));
			return newKeys.length > 0 ? [...prev, ...newKeys] : prev;
		});
	}, [jobPreferencesMap, mapSize]);

	const addSection = () => {
		const key = newSection.trim();
		if (!key || !jobPreferencesMap || jobPreferencesMap.has(key)) return;
		jobPreferencesMap.set(key, new Y.Map());
		setNewSection('');
	};

	return (
		<div className="flex h-full w-full flex-col gap-3 p-6">
			<div className="flex items-baseline justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Job Preferences
					</h1>
					<p className="text-sm text-muted-foreground">
						Your job search criteria and career preferences. Used
						for fit scoring and tailoring applications.
					</p>
				</div>
				<span className="text-xs text-muted-foreground">
					{profileStore.status}
				</span>
			</div>

			{jobPreferencesMap ? (
				<div className="flex flex-1 flex-col overflow-hidden rounded-md border border-input bg-background shadow-sm">
					<div className="flex-1 overflow-auto p-4">
						<Accordion
							type="multiple"
							value={openSections}
							onValueChange={setOpenSections}
							className="flex flex-col gap-1"
						>
							{Array.from(jobPreferencesMap.entries()).map(
								([key, value]) => (
									<AccordionItem
										key={key}
										value={key}
										className="rounded-md border border-border px-3"
									>
										<AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
											<div className="flex flex-1 items-center justify-between pr-2">
												<span>{formatKey(key)}</span>
												<button
													onClick={(e) => {
														e.stopPropagation();
														jobPreferencesMap.delete(
															key,
														);
													}}
													className="opacity-40 hover:opacity-80 transition-opacity"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										</AccordionTrigger>
										<AccordionContent className="pb-3">
											<ValueRenderer
												value={value}
												onChange={(v) =>
													jobPreferencesMap.set(
														key,
														v,
													)
												}
											/>
										</AccordionContent>
									</AccordionItem>
								),
							)}
						</Accordion>

						<div className="mt-3 flex gap-1.5">
							<Input
								value={newSection}
								onChange={(e) => setNewSection(e.target.value)}
								onKeyDown={(
									e: KeyboardEvent<HTMLInputElement>,
								) => {
									if (e.key === 'Enter') addSection();
								}}
								placeholder="Add section…"
								className="h-8 flex-1 text-sm"
							/>
							<Button
								size="sm"
								variant="outline"
								className="h-8"
								onClick={addSection}
							>
								<Plus className="h-4 w-4 mr-1" />
								Add section
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-1 items-center justify-center rounded-md border border-input bg-background text-sm text-muted-foreground shadow-sm">
					Connecting…
				</div>
			)}
		</div>
	);
});
