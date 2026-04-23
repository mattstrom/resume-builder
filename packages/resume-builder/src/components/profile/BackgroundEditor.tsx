import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ExpandableCard } from '@/components/FormEditor/components/ExpandableCard.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import type { ContactInformation, Education } from '@resume-builder/entities';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import {
	type FC,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from 'react';

// ─── Auto-save field ─────────────────────────────────────────────────────────

interface FieldProps {
	label: string;
	value: string;
	onCommit: (v: string) => void;
	type?: string;
}

const Field: FC<FieldProps> = ({ label, value, onCommit, type = 'text' }) => {
	const [draft, setDraft] = useState(value);
	const focused = useRef(false);

	useEffect(() => {
		if (!focused.current) setDraft(value);
	}, [value]);

	return (
		<div className="flex flex-col gap-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Input
				type={type}
				value={draft}
				className="h-8 text-sm"
				onChange={(e) => setDraft(e.target.value)}
				onFocus={() => {
					focused.current = true;
				}}
				onBlur={() => {
					focused.current = false;
					if (draft !== value) onCommit(draft);
				}}
				onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
					if (e.key === 'Enter') {
						focused.current = false;
						if (draft !== value) onCommit(draft);
						(e.target as HTMLInputElement).blur();
					}
				}}
			/>
		</div>
	);
};

// ─── Contact Information section ──────────────────────────────────────────────

const ContactSection: FC = observer(() => {
	const { contactInformationStore } = useStore();
	const info = contactInformationStore.data;

	const current = {
		email: info?.email ?? '',
		phoneNumber: info?.phoneNumber ?? '',
		location: info?.location ?? '',
		linkedInProfile: info?.linkedInProfile ?? '',
		githubProfile: info?.githubProfile ?? '',
		personalWebsite: info?.personalWebsite ?? '',
	};

	const commit = (patch: Partial<typeof current>) =>
		void contactInformationStore.upsert({ ...current, ...patch });

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium">Contact Information</h2>
				<p className="text-sm text-muted-foreground">
					How recruiters can reach you.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Field
					label="Email"
					type="email"
					value={current.email}
					onCommit={(v) => commit({ email: v })}
				/>
				<Field
					label="Phone"
					type="tel"
					value={current.phoneNumber}
					onCommit={(v) => commit({ phoneNumber: v })}
				/>
				<Field
					label="Location"
					value={current.location}
					onCommit={(v) => commit({ location: v })}
				/>
				<Field
					label="LinkedIn"
					value={current.linkedInProfile}
					onCommit={(v) => commit({ linkedInProfile: v })}
				/>
				<Field
					label="GitHub"
					value={current.githubProfile}
					onCommit={(v) => commit({ githubProfile: v })}
				/>
				<Field
					label="Website"
					value={current.personalWebsite}
					onCommit={(v) => commit({ personalWebsite: v })}
				/>
			</div>
		</section>
	);
});

// ─── Education entry card ─────────────────────────────────────────────────────

interface EducationCardProps {
	entry: Education;
	expanded: boolean;
	onExpandChange: () => void;
}

const EducationCard: FC<EducationCardProps> = observer(
	({ entry, expanded, onExpandChange }) => {
		const { educationStore } = useStore();

		const title =
			[entry.institution, entry.degree].filter(Boolean).join(' · ') ||
			'New entry';

		const commit = (patch: Partial<Omit<Education, '_id' | 'uid'>>) =>
			void educationStore.update(entry._id, {
				degree: entry.degree,
				field: entry.field,
				institution: entry.institution,
				graduated: entry.graduated,
				...patch,
			});

		return (
			<ExpandableCard
				title={title}
				expanded={expanded}
				onExpandChange={onExpandChange}
				onDelete={() => void educationStore.delete(entry._id)}
			>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field
						label="Institution"
						value={entry.institution}
						onCommit={(v) => commit({ institution: v })}
					/>
					<Field
						label="Degree"
						value={entry.degree}
						onCommit={(v) => commit({ degree: v })}
					/>
					<Field
						label="Field of Study"
						value={entry.field}
						onCommit={(v) => commit({ field: v })}
					/>
					<Field
						label="Graduation Date"
						value={entry.graduated}
						onCommit={(v) => commit({ graduated: v })}
					/>
				</div>
			</ExpandableCard>
		);
	},
);

// ─── Education section ────────────────────────────────────────────────────────

const EducationSection: FC = observer(() => {
	const { educationStore } = useStore();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const addEntry = async () => {
		await educationStore.create({
			institution: '',
			degree: '',
			field: '',
			graduated: '',
		});
		const latest =
			educationStore.educations[educationStore.educations.length - 1];
		if (latest) {
			setExpandedIds((prev) => new Set([...prev, latest._id]));
		}
	};

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium">Education</h2>
				<p className="text-sm text-muted-foreground">
					Degrees and academic credentials.
				</p>
			</div>
			<div>
				{educationStore.educations.map((entry) => (
					<EducationCard
						key={entry._id}
						entry={entry}
						expanded={expandedIds.has(entry._id)}
						onExpandChange={() => toggleExpanded(entry._id)}
					/>
				))}
				<Button
					variant="outline"
					size="sm"
					className="h-8"
					onClick={() => void addEntry()}
				>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					Add entry
				</Button>
			</div>
		</section>
	);
});

// ─── Main editor ──────────────────────────────────────────────────────────────

export const BackgroundEditor: FC = observer(() => {
	return (
		<div className="flex h-full w-full flex-col gap-8 p-6">
			<div>
				<h1 className="text-2xl font-semibold text-foreground">
					Background
				</h1>
				<p className="text-sm text-muted-foreground">
					Your contact details and education history. Changes save
					automatically.
				</p>
			</div>
			<ContactSection />
			<EducationSection />
		</div>
	);
});
