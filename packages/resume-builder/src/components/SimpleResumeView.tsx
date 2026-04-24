import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { LookupFieldEditor } from '@/components/LookupFieldEditor.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import {
	ResumeProvider,
	useResume,
	useResumeId,
} from '@/components/Resume.provider.tsx';
import { TextFieldEditor } from '@/components/TextFieldEditor.tsx';
import { Button } from '@/components/ui/button.tsx';
import { LIST_EDUCATIONS } from '@/graphql/queries.ts';
import {
	getResumeCollectionPath,
	ResumeCollections,
} from '@/graphql/resume-collections.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { useQuery } from '@apollo/client/react';
import type {
	Education,
	Job,
	Project,
	ResumeContent,
	Skill,
	SkillGroup,
	Volunteering,
} from '@resume-builder/entities';
import { observer } from 'mobx-react';
import { type FC, type PropsWithChildren, type ReactNode } from 'react';

import '../App.css';
import './SimpleResumeView.css';

function formatMonthYear(dateString?: string): string {
	if (!dateString) {
		return 'Date TBD';
	}

	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

function formatYear(dateString?: string): string {
	if (!dateString) {
		return 'Date TBD';
	}

	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		timeZone: 'UTC',
	});
}

interface SimpleSectionProps extends PropsWithChildren {
	title: string;
	actions?: ReactNode;
}

const SimpleSection: FC<SimpleSectionProps> = ({
	title,
	actions,
	children,
}) => {
	return (
		<section className="simple-resume-section">
			<header className="simple-resume-section-header">
				<h2>{title}</h2>
				{actions}
			</header>
			<div className="simple-resume-section-body">{children}</div>
		</section>
	);
};

const EmptyState: FC<{ copy: string }> = ({ copy }) => {
	return <p className="simple-resume-empty">{copy}</p>;
};

interface ContactFieldProps {
	label: string;
	path: string;
	value: string;
	placeholder: string;
}

const ContactField: FC<ContactFieldProps> = ({
	label,
	path,
	value,
	placeholder,
}) => {
	const resumeId = useResumeId();

	return (
		<div className="simple-resume-contact-field">
			<div className="simple-resume-contact-label">{label}</div>
			<TextFieldEditor
				path={path}
				value={value}
				resumeId={resumeId}
				className="simple-resume-contact-value"
				placeholder={placeholder}
			/>
		</div>
	);
};

function useCollectionMutations(collection: keyof typeof ResumeCollections) {
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);

	return {
		isSaving: false,
		addItem: async () => {
			controller?.addCollectionItem(ResumeCollections[collection]);
		},
		removeItem: async (index: number) => {
			controller?.removeCollectionItem(
				ResumeCollections[collection],
				index,
			);
		},
		moveItem: async (fromIndex: number, toIndex: number) => {
			controller?.moveArrayItem(
				getResumeCollectionPath(ResumeCollections[collection]),
				fromIndex,
				toIndex,
			);
		},
	};
}

const SimpleResumeContent: FC = observer(() => {
	const resume = useResume();
	const resumeId = useResumeId();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;

	return (
		<div className="simple-resume-shell">
			<header className="simple-resume-hero">
				<div className="simple-resume-identity">
					<TextFieldEditor
						path="data.name"
						value={resume.name}
						resumeId={resumeId}
						className="simple-resume-name"
						placeholder="Add candidate name"
					/>
					<TextFieldEditor
						path="data.title"
						value={resume.title}
						resumeId={resumeId}
						className="simple-resume-title"
						placeholder="Add professional title"
					/>
				</div>
				<div className="simple-resume-contact-grid">
					<ContactField
						label="Location"
						path="data.contactInformation.location"
						value={resume.contactInformation.location}
						placeholder="Add location"
					/>
					<ContactField
						label="Phone"
						path="data.contactInformation.phoneNumber"
						value={resume.contactInformation.phoneNumber}
						placeholder="Add phone number"
					/>
					<ContactField
						label="Email"
						path="data.contactInformation.email"
						value={resume.contactInformation.email}
						placeholder="Add email address"
					/>
					<ContactField
						label="LinkedIn"
						path="data.contactInformation.linkedInProfile"
						value={resume.contactInformation.linkedInProfile}
						placeholder="Add LinkedIn profile URL"
					/>
					<ContactField
						label="GitHub"
						path="data.contactInformation.githubProfile"
						value={resume.contactInformation.githubProfile}
						placeholder="Add GitHub profile URL"
					/>
					<ContactField
						label="Website"
						path="data.contactInformation.personalWebsite"
						value={resume.contactInformation.personalWebsite ?? ''}
						placeholder="Add personal website URL"
					/>
				</div>
			</header>

			<div className="simple-resume-grid">
				<div className="simple-resume-main">
					<SummarySection />
					<WorkExperienceSection />
					<ProjectsSection />
				</div>
				<div className="simple-resume-side">
					<EducationSection />
					<SkillsSection />
					<VolunteeringSection />
				</div>
			</div>
			{!isEditable && (
				<div className="simple-resume-readonly-note">
					Read-only preview
				</div>
			)}
		</div>
	);
});

const SummarySection: FC = () => {
	const { summary } = useResume();
	const resumeId = useResumeId();

	return (
		<SimpleSection title="Professional Summary">
			<TextFieldEditor
				path="data.summary"
				value={summary}
				resumeId={resumeId}
				className="simple-resume-summary"
				multiline
				placeholder="Add a professional summary"
			/>
		</SimpleSection>
	);
};

interface EntryHeaderProps {
	title: ReactNode;
	subtitle?: ReactNode;
	meta?: ReactNode;
	actions?: ReactNode;
}

const EntryHeader: FC<EntryHeaderProps> = ({
	title,
	subtitle,
	meta,
	actions,
}) => {
	return (
		<header className="simple-resume-entry-header">
			<div className="simple-resume-entry-heading">
				<div className="simple-resume-entry-title-row">
					<div className="simple-resume-entry-title">{title}</div>
					{actions}
				</div>
				{subtitle && (
					<div className="simple-resume-entry-subtitle">
						{subtitle}
					</div>
				)}
			</div>
			{meta && <div className="simple-resume-entry-meta">{meta}</div>}
		</header>
	);
};

const WorkExperienceSection: FC = observer(() => {
	const { workExperience } = useResume();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const collection = useCollectionMutations('WORK_EXPERIENCE');

	return (
		<CollectionEditor<Job>
			items={workExperience}
			isSaving={collection.isSaving}
			isEditable={isEditable}
			onAdd={collection.addItem}
			onRemove={collection.removeItem}
			onMove={collection.moveItem}
		>
			{({ items, addItem, removeItem, moveItem, isSaving }) => (
				<SimpleSection
					title="Work Experience"
					actions={
						isEditable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add job
							</Button>
						) : null
					}
				>
					{items.length === 0 ? (
						<EmptyState copy="No work experience entries yet." />
					) : (
						items.map((job, index) => (
							<CollectionEditorItem
								key={job._id}
								index={index}
								length={items.length}
								label="job"
								isEditable={isEditable}
								onMove={(fromIndex, toIndex) =>
									void moveItem(fromIndex, toIndex)
								}
								actions={
									isEditable ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												void removeItem(index)
											}
											disabled={isSaving}
										>
											Remove
										</Button>
									) : null
								}
							>
								<JobEntry job={job} index={index} />
							</CollectionEditorItem>
						))
					)}
				</SimpleSection>
			)}
		</CollectionEditor>
	);
});

const JobEntry: FC<{ job: Job; index: number }> = ({ job, index }) => {
	const resumeId = useResumeId();

	return (
		<article className="simple-resume-entry">
			<EntryHeader
				title={
					<TextFieldEditor
						path={`data.workExperience.${index}.position`}
						value={job.position}
						resumeId={resumeId}
						placeholder="Add role title"
					/>
				}
				subtitle={
					<div className="simple-resume-inline-fields">
						<TextFieldEditor
							path={`data.workExperience.${index}.company`}
							value={job.company}
							resumeId={resumeId}
							placeholder="Add company"
						/>
						<span className="simple-resume-divider">•</span>
						<TextFieldEditor
							path={`data.workExperience.${index}.location`}
							value={job.location}
							resumeId={resumeId}
							placeholder="Add location"
						/>
					</div>
				}
				meta={`${formatMonthYear(job.startDate)} - ${
					job.endDate ? formatMonthYear(job.endDate) : 'Present'
				}`}
			/>
			<ListEditor
				path={`data.workExperience.${index}.responsibilities`}
				items={job.responsibilities}
				resumeId={resumeId}
				variant="block"
				className="simple-resume-list"
				emptyPlaceholder="Add responsibility"
			/>
		</article>
	);
};

const EducationSection: FC = () => {
	const { education } = useResume();
	const resumeId = useResumeId();
	const { data } = useQuery<{ listEducations: Education[] }>(
		LIST_EDUCATIONS,
		{
			fetchPolicy: 'network-only',
		},
	);
	const options = data?.listEducations ?? [];

	return (
		<SimpleSection title="Education">
			{education.length === 0 ? (
				<EmptyState copy="No education entries linked." />
			) : (
				education.map((item, index) => (
					<LookupFieldEditor<Education, Education>
						key={index}
						as="article"
						path={`data.education.${index}`}
						value={item}
						resumeId={resumeId}
						options={options}
						className="simple-resume-entry"
						placeholder="Select education"
						getOptionKey={(option) => option._id}
						mapOptionToValue={(option, currentValue) => ({
							...currentValue,
							degree: option.degree,
							field: option.field,
							institution: option.institution,
							graduated: option.graduated,
						})}
						renderDisplay={(educationItem) => (
							<>
								<div className="simple-resume-entry-title">
									{educationItem.degree || 'Degree'}
								</div>
								<div className="simple-resume-entry-subtitle">
									{educationItem.field || 'Field of study'}
								</div>
								<div className="simple-resume-entry-meta-row">
									<span>
										{educationItem.institution ||
											'Institution'}
									</span>
									<span className="simple-resume-divider">
										•
									</span>
									<span>
										Graduated{' '}
										{formatYear(educationItem.graduated)}
									</span>
								</div>
							</>
						)}
						renderOption={(option) => (
							<>
								{option.degree} in {option.field} -{' '}
								{option.institution}
							</>
						)}
					/>
				))
			)}
		</SimpleSection>
	);
};

const SkillsSection: FC = () => {
	const { skillGroups, skills } = useResume();
	const resumeId = useResumeId();

	if (skillGroups && skillGroups.length > 0) {
		return (
			<SimpleSection title="Skills">
				{skillGroups.map((group: SkillGroup, index) => (
					<article key={index} className="simple-resume-entry">
						<div className="simple-resume-skill-group">
							<TextFieldEditor
								path={`data.skillGroups.${index}.name`}
								value={group.name}
								resumeId={resumeId}
								placeholder="Add skill group name"
							/>
							<ListEditor
								path={`data.skillGroups.${index}.items`}
								items={group.items}
								resumeId={resumeId}
								variant="inline"
								className="simple-resume-skill-items"
								emptyPlaceholder="Add skill"
							/>
						</div>
					</article>
				))}
			</SimpleSection>
		);
	}

	if (skills && skills.length > 0) {
		return (
			<SimpleSection title="Skills">
				{skills.map((skill: Skill, index) => (
					<article key={index} className="simple-resume-entry">
						<div className="simple-resume-entry-title-row">
							<TextFieldEditor
								path={`data.skills.${index}.name`}
								value={skill.name}
								resumeId={resumeId}
								placeholder="Add skill name"
							/>
							<TextFieldEditor
								path={`data.skills.${index}.category`}
								value={skill.category}
								resumeId={resumeId}
								className="simple-resume-skill-category"
								placeholder="Add category"
							/>
						</div>
					</article>
				))}
			</SimpleSection>
		);
	}

	return (
		<SimpleSection title="Skills">
			<EmptyState copy="No skills listed yet." />
		</SimpleSection>
	);
};

const ProjectsSection: FC = observer(() => {
	const { projects } = useResume();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const collection = useCollectionMutations('PROJECTS');

	return (
		<CollectionEditor<Project>
			items={projects}
			isSaving={collection.isSaving}
			isEditable={isEditable}
			onAdd={collection.addItem}
			onRemove={collection.removeItem}
			onMove={collection.moveItem}
		>
			{({ items, addItem, removeItem, moveItem, isSaving }) => (
				<SimpleSection
					title="Projects"
					actions={
						isEditable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add project
							</Button>
						) : null
					}
				>
					{items.length === 0 ? (
						<EmptyState copy="No projects added yet." />
					) : (
						items.map((project, index) => (
							<CollectionEditorItem
								key={project._id}
								index={index}
								length={items.length}
								label="project"
								isEditable={isEditable}
								onMove={(fromIndex, toIndex) =>
									void moveItem(fromIndex, toIndex)
								}
								actions={
									isEditable ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												void removeItem(index)
											}
											disabled={isSaving}
										>
											Remove
										</Button>
									) : null
								}
							>
								<ProjectEntry project={project} index={index} />
							</CollectionEditorItem>
						))
					)}
				</SimpleSection>
			)}
		</CollectionEditor>
	);
});

const ProjectEntry: FC<{
	project: ResumeContent['projects'][number];
	index: number;
}> = ({ project, index }) => {
	const resumeId = useResumeId();

	return (
		<article className="simple-resume-entry">
			<EntryHeader
				title={
					<TextFieldEditor
						path={`data.projects.${index}.name`}
						value={project.name}
						resumeId={resumeId}
						placeholder="Add project name"
					/>
				}
				subtitle={
					<TextFieldEditor
						path={`data.projects.${index}.type`}
						value={project.type ?? ''}
						resumeId={resumeId}
						placeholder="Add project type"
					/>
				}
			/>
			<ListEditor
				path={`data.projects.${index}.technologies`}
				items={project.technologies}
				resumeId={resumeId}
				variant="inline"
				className="simple-resume-tagline"
				emptyPlaceholder="Add technology"
			/>
			<ListEditor
				path={`data.projects.${index}.items`}
				items={project.items}
				resumeId={resumeId}
				variant="block"
				className="simple-resume-list"
				emptyPlaceholder="Add project detail"
			/>
		</article>
	);
};

const VolunteeringSection: FC = observer(() => {
	const { volunteering } = useResume();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const collection = useCollectionMutations('VOLUNTEERING');
	const items = volunteering ?? [];

	return (
		<CollectionEditor<Volunteering>
			items={items}
			isSaving={collection.isSaving}
			isEditable={isEditable}
			onAdd={collection.addItem}
			onRemove={collection.removeItem}
			onMove={collection.moveItem}
		>
			{({
				items: collectionItems,
				addItem,
				removeItem,
				moveItem,
				isSaving,
			}) => (
				<SimpleSection
					title="Volunteering"
					actions={
						isEditable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add role
							</Button>
						) : null
					}
				>
					{collectionItems.length === 0 ? (
						<EmptyState copy="No volunteering roles added yet." />
					) : (
						collectionItems.map((item, index) => (
							<CollectionEditorItem
								key={item._id}
								index={index}
								length={collectionItems.length}
								label="role"
								isEditable={isEditable}
								onMove={(fromIndex, toIndex) =>
									void moveItem(fromIndex, toIndex)
								}
								actions={
									isEditable ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												void removeItem(index)
											}
											disabled={isSaving}
										>
											Remove
										</Button>
									) : null
								}
							>
								<VolunteeringEntry item={item} index={index} />
							</CollectionEditorItem>
						))
					)}
				</SimpleSection>
			)}
		</CollectionEditor>
	);
});

const VolunteeringEntry: FC<{
	item: Volunteering;
	index: number;
}> = ({ item, index }) => {
	const resumeId = useResumeId();

	return (
		<article className="simple-resume-entry">
			<EntryHeader
				title={
					<TextFieldEditor
						path={`data.volunteering.${index}.position`}
						value={item.position}
						resumeId={resumeId}
						placeholder="Add role title"
					/>
				}
				subtitle={
					<div className="simple-resume-stack">
						<TextFieldEditor
							path={`data.volunteering.${index}.organization`}
							value={item.organization ?? ''}
							resumeId={resumeId}
							placeholder="Add organization"
						/>
						<TextFieldEditor
							path={`data.volunteering.${index}.location`}
							value={item.location ?? ''}
							resumeId={resumeId}
							placeholder="Add location"
						/>
					</div>
				}
				meta={`${formatYear(item.startDate)} - ${
					item.endDate ? formatYear(item.endDate) : 'Present'
				}`}
			/>
			<ListEditor
				path={`data.volunteering.${index}.responsibilities`}
				items={item.responsibilities}
				resumeId={resumeId}
				variant="block"
				className="simple-resume-list"
				emptyPlaceholder="Add responsibility"
			/>
		</article>
	);
};

export const SimpleResumeView: FC = observer(() => {
	const { editorStore } = useStore();
	const { resumeData } = editorStore;

	if (!resumeData) {
		return (
			<div className="flex h-full w-full items-center justify-center text-gray-500">
				No linked resume selected
			</div>
		);
	}

	return (
		<div className="workspace-review simple-resume-view">
			<div className="simple-resume-frame">
				<ResumeProvider data={resumeData}>
					<SimpleResumeContent />
				</ResumeProvider>
			</div>
		</div>
	);
});
