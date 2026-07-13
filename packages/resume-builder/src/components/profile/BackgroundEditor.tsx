import type { Education, Job, Project, Skill, Volunteering } from "@resume-builder/entities";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { observer } from "mobx-react";
import { type FC, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { ExpandableCard } from "@/components/FormEditor/components/ExpandableCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useStore } from "@/stores/store.provider.tsx";

// ─── Auto-save field ─────────────────────────────────────────────────────────

interface FieldProps {
	label: string;
	value: string;
	onCommit: (v: string) => void;
	type?: string;
}

const Field: FC<FieldProps> = ({ label, value, onCommit, type = "text" }) => {
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
					if (e.key === "Enter") {
						focused.current = false;
						if (draft !== value) onCommit(draft);
						(e.target as HTMLInputElement).blur();
					}
				}}
			/>
		</div>
	);
};

interface TextareaFieldProps {
	label: string;
	value: string[];
	onCommit: (v: string[]) => void;
	placeholder?: string;
}

const TextareaField: FC<TextareaFieldProps> = ({ label, value, onCommit, placeholder }) => {
	const [draft, setDraft] = useState(value.join("\n"));
	const focused = useRef(false);

	useEffect(() => {
		if (!focused.current) setDraft(value.join("\n"));
	}, [value]);

	return (
		<div className="flex flex-col gap-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Textarea
				value={draft}
				placeholder={placeholder}
				className="min-h-[80px] text-sm"
				onChange={(e) => setDraft(e.target.value)}
				onFocus={() => {
					focused.current = true;
				}}
				onBlur={() => {
					focused.current = false;
					const parsed = draft
						.split("\n")
						.map((s) => s.trim())
						.filter(Boolean);
					onCommit(parsed);
				}}
			/>
		</div>
	);
};

// ─── Auto-fill button ─────────────────────────────────────────────────────────

interface AutoFillButtonProps {
	isLoading: boolean;
	onAutofill: () => void;
}

const AutoFillButton: FC<AutoFillButtonProps> = ({ isLoading, onAutofill }) => (
	<Button variant="outline" size="sm" className="h-8" disabled={isLoading} onClick={onAutofill}>
		{isLoading ? (
			<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
		) : (
			<Sparkles className="mr-1.5 h-3.5 w-3.5" />
		)}
		Auto-fill from narrative
	</Button>
);

// ─── Contact Information section ──────────────────────────────────────────────

export const ContactSection: FC = observer(() => {
	const { contactInformationStore } = useStore();
	const info = contactInformationStore.data;

	const current = {
		email: info?.email ?? "",
		phoneNumber: info?.phoneNumber ?? "",
		location: info?.location ?? "",
		linkedInProfile: info?.linkedInProfile ?? "",
		githubProfile: info?.githubProfile ?? "",
		personalWebsite: info?.personalWebsite ?? "",
	};

	const commit = (patch: Partial<typeof current>) => void contactInformationStore.upsert({ ...current, ...patch });

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium">Contact Information</h2>
				<p className="text-sm text-muted-foreground">How recruiters can reach you.</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Field label="Email" type="email" value={current.email} onCommit={(v) => commit({ email: v })} />
				<Field
					label="Phone"
					type="tel"
					value={current.phoneNumber}
					onCommit={(v) => commit({ phoneNumber: v })}
				/>
				<Field label="Location" value={current.location} onCommit={(v) => commit({ location: v })} />
				<Field
					label="LinkedIn"
					value={current.linkedInProfile}
					onCommit={(v) => commit({ linkedInProfile: v })}
				/>
				<Field label="GitHub" value={current.githubProfile} onCommit={(v) => commit({ githubProfile: v })} />
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

const EducationCard: FC<EducationCardProps> = observer(({ entry, expanded, onExpandChange }) => {
	const { educationStore } = useStore();

	const title = [entry.institution, entry.degree].filter(Boolean).join(" · ") || "New entry";

	const commit = (patch: Partial<Omit<Education, "_id" | "uid">>) =>
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
				<Field label="Institution" value={entry.institution} onCommit={(v) => commit({ institution: v })} />
				<Field label="Degree" value={entry.degree} onCommit={(v) => commit({ degree: v })} />
				<Field label="Field of Study" value={entry.field} onCommit={(v) => commit({ field: v })} />
				<Field label="Graduation Date" value={entry.graduated} onCommit={(v) => commit({ graduated: v })} />
			</div>
		</ExpandableCard>
	);
});

// ─── Education section ────────────────────────────────────────────────────────

export const EducationSection: FC = observer(() => {
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
			institution: "",
			degree: "",
			field: "",
			graduated: "",
		});
		const latest = educationStore.educations[educationStore.educations.length - 1];
		if (latest) {
			setExpandedIds((prev) => new Set([...prev, latest._id]));
		}
	};

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium">Education</h2>
				<p className="text-sm text-muted-foreground">Degrees and academic credentials.</p>
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
				<Button variant="outline" size="sm" className="h-8" onClick={() => void addEntry()}>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					Add entry
				</Button>
			</div>
		</section>
	);
});

// ─── Work History ─────────────────────────────────────────────────────────────

interface JobCardProps {
	entry: Job;
	expanded: boolean;
	onExpandChange: () => void;
}

const JobCard: FC<JobCardProps> = observer(({ entry, expanded, onExpandChange }) => {
	const { jobsStore } = useStore();

	const title = [entry.company, entry.position].filter(Boolean).join(" · ") || "New entry";

	const commit = (patch: Partial<Omit<Job, "_id" | "uid">>) =>
		void jobsStore.update(entry._id, {
			company: entry.company,
			position: entry.position,
			location: entry.location,
			startDate: entry.startDate,
			endDate: entry.endDate,
			responsibilities: entry.responsibilities,
			relevance: entry.relevance,
			...patch,
		});

	return (
		<ExpandableCard
			title={title}
			expanded={expanded}
			onExpandChange={onExpandChange}
			onDelete={() => void jobsStore.delete(entry._id)}
		>
			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field label="Company" value={entry.company} onCommit={(v) => commit({ company: v })} />
					<Field label="Position" value={entry.position} onCommit={(v) => commit({ position: v })} />
					<Field label="Location" value={entry.location} onCommit={(v) => commit({ location: v })} />
					<Field label="Start Date" value={entry.startDate} onCommit={(v) => commit({ startDate: v })} />
					<Field
						label="End Date"
						value={entry.endDate ?? ""}
						onCommit={(v) => commit({ endDate: v || undefined })}
					/>
				</div>
				<TextareaField
					label="Responsibilities (one per line)"
					value={entry.responsibilities}
					onCommit={(v) => commit({ responsibilities: v })}
					placeholder="Led the backend migration to Postgres&#10;Reduced p99 latency by 40%"
				/>
			</div>
		</ExpandableCard>
	);
});

interface BackgroundSectionProps {
	showHeader?: boolean;
}

export const JobsSection: FC<BackgroundSectionProps> = observer(({ showHeader = true }) => {
	const { jobsStore } = useStore();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const addEntry = async () => {
		await jobsStore.create({
			company: "",
			position: "",
			location: "",
			startDate: "",
			endDate: undefined,
			responsibilities: [],
			relevance: undefined,
		});
		const latest = jobsStore.jobs[jobsStore.jobs.length - 1];
		if (latest) setExpandedIds((prev) => new Set([...prev, latest._id]));
	};

	return (
		<section className="flex flex-col gap-4">
			{showHeader && (
				<div>
					<h2 className="text-lg font-medium">Work History</h2>
					<p className="text-sm text-muted-foreground">Previous and current roles.</p>
				</div>
			)}
			<div>
				{jobsStore.jobs.map((entry) => (
					<JobCard
						key={entry._id}
						entry={entry}
						expanded={expandedIds.has(entry._id)}
						onExpandChange={() => toggleExpanded(entry._id)}
					/>
				))}
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="h-8" onClick={() => void addEntry()}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Add entry
					</Button>
					<AutoFillButton isLoading={jobsStore.isAutoFilling} onAutofill={() => void jobsStore.autofill()} />
				</div>
			</div>
		</section>
	);
});

// ─── Projects ─────────────────────────────────────────────────────────────────

interface ProjectCardProps {
	entry: Project;
	expanded: boolean;
	onExpandChange: () => void;
}

const ProjectCard: FC<ProjectCardProps> = observer(({ entry, expanded, onExpandChange }) => {
	const { projectsStore } = useStore();

	const title = entry.name || "New entry";

	const commit = (patch: Partial<Omit<Project, "_id" | "uid">>) =>
		void projectsStore.update(entry._id, {
			name: entry.name,
			technologies: entry.technologies,
			items: entry.items,
			type: entry.type,
			relevance: entry.relevance,
			...patch,
		});

	return (
		<ExpandableCard
			title={title}
			expanded={expanded}
			onExpandChange={onExpandChange}
			onDelete={() => void projectsStore.delete(entry._id)}
		>
			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field label="Name" value={entry.name} onCommit={(v) => commit({ name: v })} />
					<div className="flex flex-col gap-1">
						<Label className="text-xs text-muted-foreground">Type</Label>
						<Select
							value={entry.type ?? ""}
							onValueChange={(v) => commit({ type: (v as "professional" | "personal") || undefined })}
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="professional">Professional</SelectItem>
								<SelectItem value="personal">Personal</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="sm:col-span-2">
						<Field
							label="Technologies (comma-separated)"
							value={entry.technologies.join(", ")}
							onCommit={(v) =>
								commit({
									technologies: v
										.split(",")
										.map((s) => s.trim())
										.filter(Boolean),
								})
							}
						/>
					</div>
				</div>
				<TextareaField
					label="Highlights (one per line)"
					value={entry.items}
					onCommit={(v) => commit({ items: v })}
					placeholder="Built real-time collaborative editing with Yjs&#10;Reduced bundle size by 30%"
				/>
			</div>
		</ExpandableCard>
	);
});

export const ProjectsSection: FC<BackgroundSectionProps> = observer(({ showHeader = true }) => {
	const { projectsStore } = useStore();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const addEntry = async () => {
		await projectsStore.create({
			name: "",
			technologies: [],
			items: [],
			type: undefined,
			relevance: undefined,
		});
		const latest = projectsStore.projects[projectsStore.projects.length - 1];
		if (latest) setExpandedIds((prev) => new Set([...prev, latest._id]));
	};

	return (
		<section className="flex flex-col gap-4">
			{showHeader && (
				<div>
					<h2 className="text-lg font-medium">Projects</h2>
					<p className="text-sm text-muted-foreground">Personal and professional projects.</p>
				</div>
			)}
			<div>
				{projectsStore.projects.map((entry) => (
					<ProjectCard
						key={entry._id}
						entry={entry}
						expanded={expandedIds.has(entry._id)}
						onExpandChange={() => toggleExpanded(entry._id)}
					/>
				))}
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="h-8" onClick={() => void addEntry()}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Add entry
					</Button>
					<AutoFillButton
						isLoading={projectsStore.isAutoFilling}
						onAutofill={() => void projectsStore.autofill()}
					/>
				</div>
			</div>
		</section>
	);
});

// ─── Skills ───────────────────────────────────────────────────────────────────

interface SkillCardProps {
	entry: Skill;
	expanded: boolean;
	onExpandChange: () => void;
}

const SkillCard: FC<SkillCardProps> = observer(({ entry, expanded, onExpandChange }) => {
	const { skillsStore } = useStore();

	const title = [entry.name, entry.category].filter(Boolean).join(" · ") || "New entry";

	const commit = (patch: Partial<Omit<Skill, "_id" | "uid">>) =>
		void skillsStore.update(entry._id, {
			name: entry.name,
			category: entry.category,
			relevance: entry.relevance,
			...patch,
		});

	return (
		<ExpandableCard
			title={title}
			expanded={expanded}
			onExpandChange={onExpandChange}
			onDelete={() => void skillsStore.delete(entry._id)}
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Field label="Skill" value={entry.name} onCommit={(v) => commit({ name: v })} />
				<Field label="Category" value={entry.category} onCommit={(v) => commit({ category: v })} />
			</div>
		</ExpandableCard>
	);
});

export const SkillsSection: FC<BackgroundSectionProps> = observer(({ showHeader = true }) => {
	const { skillsStore } = useStore();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const addEntry = async () => {
		await skillsStore.create({ name: "", category: "", relevance: undefined });
		const latest = skillsStore.skills[skillsStore.skills.length - 1];
		if (latest) setExpandedIds((prev) => new Set([...prev, latest._id]));
	};

	return (
		<section className="flex flex-col gap-4">
			{showHeader && (
				<div>
					<h2 className="text-lg font-medium">Skills</h2>
					<p className="text-sm text-muted-foreground">Technical and professional skills.</p>
				</div>
			)}
			<div>
				{skillsStore.skills.map((entry) => (
					<SkillCard
						key={entry._id}
						entry={entry}
						expanded={expandedIds.has(entry._id)}
						onExpandChange={() => toggleExpanded(entry._id)}
					/>
				))}
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="h-8" onClick={() => void addEntry()}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Add entry
					</Button>
					<AutoFillButton
						isLoading={skillsStore.isAutoFilling}
						onAutofill={() => void skillsStore.autofill()}
					/>
				</div>
			</div>
		</section>
	);
});

// ─── Volunteering ─────────────────────────────────────────────────────────────

interface VolunteeringCardProps {
	entry: Volunteering;
	expanded: boolean;
	onExpandChange: () => void;
}

const VolunteeringCard: FC<VolunteeringCardProps> = observer(({ entry, expanded, onExpandChange }) => {
	const { volunteeringStore } = useStore();

	const title = [entry.organization, entry.position].filter(Boolean).join(" · ") || "New entry";

	const commit = (patch: Partial<Omit<Volunteering, "_id" | "uid">>) =>
		void volunteeringStore.update(entry._id, {
			organization: entry.organization,
			position: entry.position,
			location: entry.location,
			startDate: entry.startDate,
			endDate: entry.endDate,
			responsibilities: entry.responsibilities,
			relevance: entry.relevance,
			...patch,
		});

	return (
		<ExpandableCard
			title={title}
			expanded={expanded}
			onExpandChange={onExpandChange}
			onDelete={() => void volunteeringStore.delete(entry._id)}
		>
			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field
						label="Organization"
						value={entry.organization ?? ""}
						onCommit={(v) => commit({ organization: v || undefined })}
					/>
					<Field label="Position" value={entry.position} onCommit={(v) => commit({ position: v })} />
					<Field
						label="Location"
						value={entry.location ?? ""}
						onCommit={(v) => commit({ location: v || undefined })}
					/>
					<Field label="Start Date" value={entry.startDate} onCommit={(v) => commit({ startDate: v })} />
					<Field
						label="End Date"
						value={entry.endDate ?? ""}
						onCommit={(v) => commit({ endDate: v || undefined })}
					/>
				</div>
				<TextareaField
					label="Responsibilities (one per line)"
					value={entry.responsibilities}
					onCommit={(v) => commit({ responsibilities: v })}
					placeholder="Organized weekly food drives&#10;Mentored at-risk youth"
				/>
			</div>
		</ExpandableCard>
	);
});

export const VolunteeringSection: FC<BackgroundSectionProps> = observer(({ showHeader = true }) => {
	const { volunteeringStore } = useStore();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const addEntry = async () => {
		await volunteeringStore.create({
			organization: undefined,
			position: "",
			location: undefined,
			startDate: "",
			endDate: undefined,
			responsibilities: [],
			relevance: undefined,
		});
		const latest = volunteeringStore.volunteering[volunteeringStore.volunteering.length - 1];
		if (latest) setExpandedIds((prev) => new Set([...prev, latest._id]));
	};

	return (
		<section className="flex flex-col gap-4">
			{showHeader && (
				<div>
					<h2 className="text-lg font-medium">Volunteering</h2>
					<p className="text-sm text-muted-foreground">Community and volunteer work.</p>
				</div>
			)}
			<div>
				{volunteeringStore.volunteering.map((entry) => (
					<VolunteeringCard
						key={entry._id}
						entry={entry}
						expanded={expandedIds.has(entry._id)}
						onExpandChange={() => toggleExpanded(entry._id)}
					/>
				))}
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="h-8" onClick={() => void addEntry()}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Add entry
					</Button>
					<AutoFillButton
						isLoading={volunteeringStore.isAutoFilling}
						onAutofill={() => void volunteeringStore.autofill()}
					/>
				</div>
			</div>
		</section>
	);
});

// ─── Main editor ──────────────────────────────────────────────────────────────

export const BackgroundEditor: FC = observer(() => {
	return (
		<div className="flex h-full w-full flex-col gap-8 overflow-y-auto p-6">
			<div>
				<h1 className="text-2xl font-semibold text-foreground">Background</h1>
				<p className="text-sm text-muted-foreground">
					Your contact details and career history. Changes save automatically.
				</p>
			</div>
			<ContactSection />
			<EducationSection />
			<JobsSection />
			<ProjectsSection />
			<SkillsSection />
			<VolunteeringSection />
		</div>
	);
});
