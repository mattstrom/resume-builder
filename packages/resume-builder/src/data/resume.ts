import { outdent } from 'outdent';
import type { Resume } from '@resume-builder/entities';

export const resume: Resume = {
	_id: 'RES-4',
	id: 'RES-4',
	name: 'Resume',
	company: '',
	jobPostingUrl: '',
	data: {
		_id: 'resume-content-1',
		name: 'Alex Johnson',
		title: 'Senior Software Engineer',
		contactInformation: {
			_id: 'contact-1',
			location: 'Anytown, USA',
			phoneNumber: '(555) 123-4567',
			email: 'alex.johnson@example.com',
			linkedInProfile: 'https://linkedin.com/in/alexjohnson',
			githubProfile: 'https://github.com/alexjohnson',
			personalWebsite: 'https://alexjohnson.dev',
		},
		summary: outdent`
		Senior Software Engineer with 10+ years of full-stack experience building web applications.
		Proficient in React, TypeScript, Node.js, and cloud infrastructure. Experienced with real-time
		systems, CI/CD pipelines, and cross-functional team leadership.
	`,
		workExperience: [
			{
				_id: 'job-1',
				company: 'Acme Corp',
				position: 'Senior Software Engineer',
				location: 'Anytown, USA',
				startDate: 'March 2019',
				endDate: 'December 2025',
				responsibilities: [
					'Built and maintained full-stack web applications using React, TypeScript, and Node.js',
					'Designed RESTful and GraphQL APIs with PostgreSQL and Redis backends',
					'Managed cloud infrastructure on AWS including Lambda, ECS, and CloudFront',
					'Set up CI/CD pipelines with GitHub Actions for automated testing and deployment',
					'Led a small team of engineers and conducted code reviews',
					'Developed internal tooling to improve developer productivity',
				],
			},
			{
				_id: 'job-2',
				company: 'Beta Labs',
				position: 'Software Engineer',
				location: 'Anytown, USA',
				startDate: 'July 2016',
				endDate: 'March 2019',
				responsibilities: [
					'Developed customer-facing web applications and JavaScript SDKs',
					'Migrated legacy frontend codebase to modern frameworks and TypeScript',
					'Introduced containerized development and deployment workflows',
					'Collaborated with product and design teams to ship features end-to-end',
				],
			},
			{
				_id: 'job-3',
				company: 'Gamma Studios',
				position: 'Junior Software Engineer',
				location: 'Anytown, USA',
				startDate: 'July 2014',
				endDate: 'July 2016',
				responsibilities: [
					'Built responsive web applications with modern JavaScript frameworks',
					'Refactored legacy code to improve test coverage and reduce technical debt',
					'Contributed to cross-platform desktop application development',
				],
			},
		],
		education: [
			{
				_id: 'edu-1',
				degree: 'Bachelor of Science',
				field: 'Computer Science',
				institution: 'State University',
				graduated: 'May 2014',
			},
		],
		skillGroups: [
			{
				_id: 'sg-1',
				name: 'Languages',
				items: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C#'],
			},
			{
				_id: 'sg-2',
				name: 'Frontend',
				items: ['React', 'Next.js', 'Tailwind CSS', 'Webpack', 'Vite'],
			},
			{
				_id: 'sg-3',
				name: 'Backend',
				items: [
					'Node.js',
					'NestJS',
					'GraphQL',
					'REST APIs',
					'WebSockets',
				],
			},
			{
				_id: 'sg-4',
				name: 'Databases',
				items: ['PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB'],
			},
			{
				_id: 'sg-5',
				name: 'Infrastructure',
				items: [
					'AWS',
					'GitHub Actions',
					'CI/CD',
					'Docker',
					'Kubernetes',
				],
			},
		],
		projects: [
			{
				_id: 'proj-1',
				name: 'Task Management App',
				technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
				items: [
					'Built a full-stack task management application with real-time updates',
					'Implemented drag-and-drop kanban board with optimistic UI updates',
					'Designed RESTful API with role-based access control',
				],
			},
			{
				_id: 'proj-2',
				name: 'E-commerce Platform',
				technologies: [
					'React',
					'Node.js',
					'GraphQL',
					'Stripe',
					'PostgreSQL',
				],
				items: [
					'Architected and built a multi-tenant e-commerce platform',
					'Integrated payment processing with Stripe',
					'Implemented search and filtering with full-text search',
					'Built admin dashboard with analytics and reporting',
				],
			},
			{
				_id: 'proj-3',
				name: 'Real-time Chat System',
				technologies: ['WebSockets', 'Redis', 'Node.js', 'React'],
				items: [
					'Built real-time messaging system supporting group and direct messages',
					'Implemented presence indicators and typing notifications',
					'Designed message persistence and search functionality',
				],
			},
			{
				_id: 'proj-4',
				name: 'Job Queue Service',
				technologies: ['Node.js', 'BullMQ', 'Redis'],
				items: [
					'Architected distributed job queue for background task processing',
					'Added monitoring dashboard for job status and metrics',
				],
			},
			{
				_id: 'proj-5',
				name: 'CI/CD Pipeline',
				technologies: ['GitHub Actions', 'Docker', 'AWS'],
				items: [
					'Set up automated testing, building, and deployment pipelines',
					'Implemented preview environments for pull requests',
					'Built deployment notification system integrated with Slack',
				],
			},
			{
				_id: 'proj-6',
				name: 'CLI Developer Tool',
				technologies: ['Node.js', 'TypeScript', 'Commander.js'],
				items: [
					'Built CLI tool for scaffolding and managing project templates',
					'Implemented plugin system for extensibility',
				],
			},
			{
				_id: 'proj-7',
				name: 'Component Library',
				technologies: [
					'React',
					'TypeScript',
					'Storybook',
					'Tailwind CSS',
				],
				items: [
					'Created shared component library used across multiple applications',
					'Built interactive documentation with Storybook',
				],
			},
		],
	},
};
