/**
 * SSR-safe layout components that don't import CSS files.
 * These re-implement the layout structure for server-side rendering.
 */
import { createElement, type FC, type PropsWithChildren } from 'react';
import { useResume } from '@mattstrom/resume-builder/providers';

// Re-implement minimal versions of components for SSR

interface LayoutProps {
	name: string;
}

const Layout: FC<PropsWithChildren<LayoutProps>> = ({ name, children }) => {
	return createElement(
		'div',
		{ className: `layout ${name}` },
		createElement('article', { className: 'resume' }, children),
	);
};

const Page: FC<PropsWithChildren> = ({ children }) => {
	return createElement(
		'div',
		{ className: 'page' },
		createElement('section', { className: 'page-content' }, children),
	);
};

// Section components (minimal SSR versions)
const Masthead: FC = () => {
	const resume = useResume();
	return createElement(
		'header',
		{ className: 'masthead' },
		createElement('h1', null, resume.name),
		createElement('p', { className: 'title' }, resume.title),
	);
};

const SummarySection: FC = () => {
	const { summary } = useResume();
	if (!summary) return null;
	return createElement(
		'section',
		{ className: 'summary' },
		createElement('h2', null, 'Summary'),
		createElement('p', null, summary),
	);
};

const WorkExperience: FC = () => {
	const { workExperience } = useResume();
	if (!workExperience?.length) return null;

	return createElement(
		'section',
		{ className: 'work-experience' },
		createElement('h2', null, 'Work Experience'),
		...workExperience.map((job, i) =>
			createElement(
				'div',
				{ key: i, className: 'job' },
				createElement('h3', null, `${job.position} at ${job.company}`),
				createElement(
					'p',
					{ className: 'dates' },
					`${job.startDate} - ${job.endDate || 'Present'}`,
				),
				job.location &&
					createElement('p', { className: 'location' }, job.location),
				job.responsibilities?.length &&
					createElement(
						'ul',
						null,
						...job.responsibilities.map((r, j) =>
							createElement('li', { key: j }, r),
						),
					),
			),
		),
	);
};

const EducationSection: FC = () => {
	const { education } = useResume();
	if (!education?.length) return null;

	return createElement(
		'section',
		{ className: 'education' },
		createElement('h2', null, 'Education'),
		...education.map((edu, i) =>
			createElement(
				'div',
				{ key: i, className: 'education-item' },
				createElement('h3', null, edu.degree),
				createElement('p', null, `${edu.field} - ${edu.institution}`),
				edu.graduated &&
					createElement('p', null, `Graduated: ${edu.graduated}`),
			),
		),
	);
};

const SkillsSection: FC = () => {
	const { skills } = useResume();
	if (!skills?.length) return null;

	return createElement(
		'section',
		{ className: 'skills' },
		createElement('h2', null, 'Skills'),
		...skills.map((group, i) =>
			createElement(
				'div',
				{ key: i, className: 'skill-group' },
				createElement('h3', null, group.name),
				createElement('p', null, group.items.join(', ')),
			),
		),
	);
};

const ProjectsSection: FC = () => {
	const { projects } = useResume();
	if (!projects?.length) return null;

	return createElement(
		'section',
		{ className: 'projects' },
		createElement('h2', null, 'Projects'),
		...projects.map((project, i) =>
			createElement(
				'div',
				{ key: i, className: 'project' },
				createElement('h3', null, project.name),
				project.technologies?.length &&
					createElement(
						'p',
						{ className: 'technologies' },
						`Technologies: ${project.technologies.join(', ')}`,
					),
				project.items?.length &&
					createElement(
						'ul',
						null,
						...project.items.map((item, j) =>
							createElement('li', { key: j }, item),
						),
					),
			),
		),
	);
};

const ContactInfo: FC = () => {
	const { contactInformation } = useResume();
	if (!contactInformation) return null;

	const info = contactInformation;
	return createElement(
		'section',
		{ className: 'contact-info' },
		info.email && createElement('p', null, `Email: ${info.email}`),
		info.phoneNumber &&
			createElement('p', null, `Phone: ${info.phoneNumber}`),
		info.location && createElement('p', null, `Location: ${info.location}`),
		info.linkedInProfile &&
			createElement(
				'p',
				null,
				createElement('a', { href: info.linkedInProfile }, 'LinkedIn'),
			),
		info.githubProfile &&
			createElement(
				'p',
				null,
				createElement('a', { href: info.githubProfile }, 'GitHub'),
			),
	);
};

// Layout components
export const BasicLayout: FC = () => {
	return createElement(
		Layout,
		{ name: 'basic' },
		createElement(
			Page,
			null,
			createElement(Masthead),
			createElement(ContactInfo),
			createElement(SummarySection),
			createElement(WorkExperience),
			createElement(EducationSection),
			createElement(SkillsSection),
		),
		createElement(Page, null, createElement(ProjectsSection)),
	);
};

export const ColumnLayout: FC = () => {
	const { title } = useResume();

	return createElement(
		Layout,
		{ name: 'column' },
		createElement(
			Page,
			null,
			createElement(
				'div',
				{ className: 'column left' },
				createElement(Masthead),
				createElement(ContactInfo),
				createElement(EducationSection),
				createElement(SkillsSection),
			),
			createElement(
				'div',
				{ className: 'column right' },
				createElement(SummarySection),
				createElement(WorkExperience),
			),
		),
		createElement(Page, null, createElement(ProjectsSection)),
	);
};

export const GridLayout: FC = () => {
	return createElement(
		Layout,
		{ name: 'grid' },
		createElement(
			Page,
			null,
			createElement(Masthead),
			createElement(ContactInfo),
			createElement(SummarySection),
			createElement(WorkExperience),
		),
		createElement(
			Page,
			null,
			createElement(EducationSection),
			createElement(SkillsSection),
			createElement(ProjectsSection),
		),
	);
};
