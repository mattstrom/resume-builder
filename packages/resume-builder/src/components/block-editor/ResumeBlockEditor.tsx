import type {
	Education,
	ResumeBullet,
	ResumeContent,
	ResumeJob,
	ResumeProject,
	ResumeVolunteering,
	Skill,
	SkillGroup,
} from '@resume-builder/entities';
import { GripVertical } from 'lucide-react';
import { observer } from 'mobx-react';
import type { ReactNode } from 'react';

import { useResume, useResumeId } from '@/components/Resume.provider.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';

import { BlockEditor, type EditorBlock } from './BlockEditor.tsx';
import { SortableBlockList } from './SortableBlockList.tsx';

interface FieldDefinition {
	path: string;
	value: string | undefined;
	type: EditorBlock['type'];
	label: string;
	placeholder: string;
}

function toBlocks(fields: readonly FieldDefinition[]): EditorBlock[] {
	return fields.map((field) => ({
		id: field.path,
		type: field.type,
		text: field.value ?? '',
		ariaLabel: field.label,
		placeholder: field.placeholder,
	}));
}

function stableId(value: { _id?: unknown }, fallback: string) {
	return typeof value._id === 'string' ? value._id : fallback;
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3 py-5">
			<header className="flex flex-col gap-1 px-2">
				<h2 className="text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
				{description ? <p className="text-xs text-zinc-500">{description}</p> : null}
			</header>
			{children}
		</section>
	);
}

function CollectionItems<T extends { _id?: unknown }>({
	items,
	path,
	itemLabel,
	children,
}: {
	items: readonly T[];
	path: string;
	itemLabel: string;
	children: (item: T, index: number) => ReactNode;
}) {
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	const sortableItems = items.map((item, index) => ({
		id: stableId(item, `${path}-${index}`),
		value: item,
	}));

	return (
		<SortableBlockList
			items={sortableItems}
			onMove={(fromIndex, toIndex) => controller?.moveArrayItem(path, fromIndex, toIndex)}
			className="gap-4"
			ariaLabel={`${itemLabel} blocks`}
		>
			{(item, index, sortable) => (
				<article className="group/item relative rounded-lg border border-zinc-200 bg-white px-3 py-3 shadow-sm">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute -left-9 top-3 size-8 cursor-grab text-zinc-500 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
						aria-label={`Drag ${itemLabel} ${index + 1} to reorder`}
						title="Drag to reorder · Option/Alt + arrow keys"
						{...sortable.dragHandleProps}
					>
						<GripVertical />
					</Button>
					{children(item.value, index)}
				</article>
			)}
		</SortableBlockList>
	);
}

function Fields({ fields }: { fields: readonly FieldDefinition[] }) {
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	return (
		<BlockEditor
			blocks={toBlocks(fields)}
			onChange={(path, text) => controller?.setField(path, text)}
		/>
	);
}

function BulletFields({
	items,
	path,
	label = 'Bullet',
}: {
	items: readonly ResumeBullet[];
	path: string;
	label?: string;
}) {
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	const blocks = items.map(
		(item, index): EditorBlock => ({
			id: stableId(item, `${path}-${index}`),
			type: 'bullet',
			text: item.text,
			ariaLabel: `${label} ${index + 1}`,
			placeholder: `Add ${label.toLowerCase()}`,
		}),
	);

	return (
		<BlockEditor
			blocks={blocks}
			onChange={(blockId, text) => {
				const index = blocks.findIndex((block) => block.id === blockId);
				if (index >= 0) controller?.setField(`${path}.${index}.text`, text);
			}}
			onMove={(fromIndex, toIndex) => controller?.moveArrayItem(path, fromIndex, toIndex)}
		/>
	);
}

function StringBulletFields({
	items,
	path,
	label,
}: {
	items: readonly string[];
	path: string;
	label: string;
}) {
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	const blocks = items.map(
		(item, index): EditorBlock => ({
			id: `${path}-${index}`,
			type: 'bullet',
			text: item,
			ariaLabel: `${label} ${index + 1}`,
			placeholder: `Add ${label.toLowerCase()}`,
		}),
	);

	return (
		<BlockEditor
			blocks={blocks}
			onChange={(blockId, text) => {
				const index = blocks.findIndex((block) => block.id === blockId);
				if (index >= 0) controller?.setField(`${path}.${index}`, text);
			}}
			onMove={(fromIndex, toIndex) => controller?.moveArrayItem(path, fromIndex, toIndex)}
		/>
	);
}

function ContactBlocks({ contact }: { contact: ResumeContent['contactInformation'] }) {
	return (
		<Fields
			fields={[
				{
					path: 'data.contactInformation.location',
					value: contact.location,
					type: 'paragraph',
					label: 'Location',
					placeholder: 'Location',
				},
				{
					path: 'data.contactInformation.phoneNumber',
					value: contact.phoneNumber,
					type: 'paragraph',
					label: 'Phone number',
					placeholder: 'Phone number',
				},
				{
					path: 'data.contactInformation.email',
					value: contact.email,
					type: 'paragraph',
					label: 'Email',
					placeholder: 'Email',
				},
				{
					path: 'data.contactInformation.linkedInProfile',
					value: contact.linkedInProfile,
					type: 'paragraph',
					label: 'LinkedIn profile',
					placeholder: 'LinkedIn profile',
				},
				{
					path: 'data.contactInformation.githubProfile',
					value: contact.githubProfile,
					type: 'paragraph',
					label: 'GitHub profile',
					placeholder: 'GitHub profile',
				},
				{
					path: 'data.contactInformation.personalWebsite',
					value: contact.personalWebsite,
					type: 'paragraph',
					label: 'Personal website',
					placeholder: 'Personal website',
				},
			]}
		/>
	);
}

function JobBlock({ job, index }: { job: ResumeJob; index: number }) {
	const path = `data.workExperience.${index}`;
	return (
		<div className="flex flex-col gap-2">
			<Fields
				fields={[
					{
						path: `${path}.position`,
						value: job.position,
						type: 'heading-3',
						label: 'Position',
						placeholder: 'Position',
					},
					{
						path: `${path}.company`,
						value: job.company,
						type: 'heading-3',
						label: 'Company',
						placeholder: 'Company',
					},
					{
						path: `${path}.location`,
						value: job.location,
						type: 'paragraph',
						label: 'Location',
						placeholder: 'Location',
					},
					{
						path: `${path}.startDate`,
						value: job.startDate,
						type: 'paragraph',
						label: 'Start date',
						placeholder: 'Start date',
					},
					{
						path: `${path}.endDate`,
						value: job.endDate,
						type: 'paragraph',
						label: 'End date',
						placeholder: 'End date or Present',
					},
				]}
			/>
			<BulletFields
				items={job.responsibilities ?? []}
				path={`${path}.responsibilities`}
				label="Responsibility"
			/>
		</div>
	);
}

function ProjectBlock({ project, index }: { project: ResumeProject; index: number }) {
	const path = `data.projects.${index}`;
	return (
		<div className="flex flex-col gap-2">
			<Fields
				fields={[
					{
						path: `${path}.name`,
						value: project.name,
						type: 'heading-3',
						label: 'Project name',
						placeholder: 'Project name',
					},
					{
						path: `${path}.description`,
						value: project.description,
						type: 'paragraph',
						label: 'Project description',
						placeholder: 'Project description',
					},
					{
						path: `${path}.type`,
						value: project.type,
						type: 'paragraph',
						label: 'Project type',
						placeholder: 'Project type',
					},
				]}
			/>
			<BulletFields
				items={project.items ?? []}
				path={`${path}.items`}
				label="Project bullet"
			/>
			<StringBulletFields
				items={project.technologies ?? []}
				path={`${path}.technologies`}
				label="Technology"
			/>
		</div>
	);
}

function EducationBlock({ education, index }: { education: Education; index: number }) {
	const path = `data.education.${index}`;
	return (
		<Fields
			fields={[
				{
					path: `${path}.degree`,
					value: education.degree,
					type: 'heading-3',
					label: 'Degree',
					placeholder: 'Degree',
				},
				{
					path: `${path}.field`,
					value: education.field,
					type: 'paragraph',
					label: 'Field of study',
					placeholder: 'Field of study',
				},
				{
					path: `${path}.institution`,
					value: education.institution,
					type: 'paragraph',
					label: 'Institution',
					placeholder: 'Institution',
				},
				{
					path: `${path}.graduated`,
					value: education.graduated,
					type: 'paragraph',
					label: 'Graduation date',
					placeholder: 'Graduation date',
				},
			]}
		/>
	);
}

function SkillBlock({ skill, index }: { skill: Skill; index: number }) {
	const path = `data.skills.${index}`;
	return (
		<Fields
			fields={[
				{
					path: `${path}.name`,
					value: skill.name,
					type: 'bullet',
					label: 'Skill',
					placeholder: 'Skill',
				},
				{
					path: `${path}.category`,
					value: skill.category,
					type: 'paragraph',
					label: 'Skill category',
					placeholder: 'Category',
				},
			]}
		/>
	);
}

function SkillGroupBlock({ group, index }: { group: SkillGroup; index: number }) {
	const path = `data.skillGroups.${index}`;
	return (
		<div className="flex flex-col gap-2">
			<Fields
				fields={[
					{
						path: `${path}.name`,
						value: group.name,
						type: 'heading-3',
						label: 'Skill group',
						placeholder: 'Skill group',
					},
				]}
			/>
			<StringBulletFields items={group.items ?? []} path={`${path}.items`} label="Skill" />
		</div>
	);
}

function VolunteeringBlock({ entry, index }: { entry: ResumeVolunteering; index: number }) {
	const path = `data.volunteering.${index}`;
	return (
		<div className="flex flex-col gap-2">
			<Fields
				fields={[
					{
						path: `${path}.position`,
						value: entry.position,
						type: 'heading-3',
						label: 'Volunteer position',
						placeholder: 'Position',
					},
					{
						path: `${path}.organization`,
						value: entry.organization,
						type: 'heading-3',
						label: 'Organization',
						placeholder: 'Organization',
					},
					{
						path: `${path}.location`,
						value: entry.location,
						type: 'paragraph',
						label: 'Location',
						placeholder: 'Location',
					},
					{
						path: `${path}.startDate`,
						value: entry.startDate,
						type: 'paragraph',
						label: 'Start date',
						placeholder: 'Start date',
					},
					{
						path: `${path}.endDate`,
						value: entry.endDate,
						type: 'paragraph',
						label: 'End date',
						placeholder: 'End date or Present',
					},
				]}
			/>
			<BulletFields
				items={entry.responsibilities ?? []}
				path={`${path}.responsibilities`}
				label="Responsibility"
			/>
		</div>
	);
}

export const ResumeBlockEditor = observer(function ResumeBlockEditor() {
	const resume = useResume();

	return (
		<div className="h-full overflow-y-auto bg-zinc-100 p-5 text-zinc-950 md:p-8">
			<main className="mx-auto flex min-h-full w-full max-w-3xl flex-col rounded-xl border border-zinc-200 bg-white px-8 py-10 shadow-sm md:px-14">
				<header className="mb-4 flex items-center justify-between gap-3 px-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
							Block editor
						</p>
						<p className="text-xs text-zinc-500">
							Click to edit. Drag handles appear on hover.
						</p>
					</div>
					<Badge variant="outline">Autosaved</Badge>
				</header>
				<Fields
					fields={[
						{
							path: 'data.name',
							value: resume.name,
							type: 'heading-1',
							label: 'Candidate name',
							placeholder: 'Candidate name',
						},
						{
							path: 'data.title',
							value: resume.title,
							type: 'heading-2',
							label: 'Professional title',
							placeholder: 'Professional title',
						},
					]}
				/>
				<Section title="Contact">
					<ContactBlocks contact={resume.contactInformation} />
				</Section>
				<Separator />
				<Section title="Professional Summary">
					<Fields
						fields={[
							{
								path: 'data.summary',
								value: resume.summary,
								type: 'paragraph',
								label: 'Professional summary',
								placeholder: 'Write a professional summary',
							},
						]}
					/>
				</Section>
				<Separator />
				<Section
					title="Work Experience"
					description="Drag roles and bullets to rearrange them."
				>
					<CollectionItems
						items={resume.workExperience ?? []}
						path="data.workExperience"
						itemLabel="role"
					>
						{(job, index) => <JobBlock job={job} index={index} />}
					</CollectionItems>
				</Section>
				<Separator />
				<Section title="Projects">
					<CollectionItems
						items={resume.projects ?? []}
						path="data.projects"
						itemLabel="project"
					>
						{(project, index) => <ProjectBlock project={project} index={index} />}
					</CollectionItems>
				</Section>
				<Separator />
				<Section title="Education">
					<CollectionItems
						items={resume.education ?? []}
						path="data.education"
						itemLabel="education"
					>
						{(education, index) => (
							<EducationBlock education={education} index={index} />
						)}
					</CollectionItems>
				</Section>
				{(resume.skillGroups?.length ?? 0) > 0 ? (
					<>
						<Separator />
						<Section title="Skill Groups">
							<CollectionItems
								items={resume.skillGroups ?? []}
								path="data.skillGroups"
								itemLabel="skill group"
							>
								{(group, index) => <SkillGroupBlock group={group} index={index} />}
							</CollectionItems>
						</Section>
					</>
				) : null}
				{(resume.skills?.length ?? 0) > 0 ? (
					<>
						<Separator />
						<Section title="Skills">
							<CollectionItems
								items={resume.skills ?? []}
								path="data.skills"
								itemLabel="skill"
							>
								{(skill, index) => <SkillBlock skill={skill} index={index} />}
							</CollectionItems>
						</Section>
					</>
				) : null}
				{(resume.volunteering?.length ?? 0) > 0 ? (
					<>
						<Separator />
						<Section title="Volunteering">
							<CollectionItems
								items={resume.volunteering ?? []}
								path="data.volunteering"
								itemLabel="volunteer role"
							>
								{(entry, index) => (
									<VolunteeringBlock entry={entry} index={index} />
								)}
							</CollectionItems>
						</Section>
					</>
				) : null}
			</main>
		</div>
	);
});
