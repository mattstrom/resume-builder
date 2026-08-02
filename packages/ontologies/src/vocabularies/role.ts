import { vocabulary } from '../core/vocabulary.js';

/**
 * What someone does, independent of how senior they are.
 *
 * Role and seniority are kept separate on purpose. "Staff Backend Engineer" is
 * `role:backend-engineer` plus `seniority:staff`, not one concept — which keeps
 * this tree from multiplying by the length of the ladder, and lets a job
 * requirement match on role while negotiating separately on level.
 */
export const role = vocabulary(
	'role',
	{
		// ── Engineering ───────────────────────────────────────────────────────
		engineering: {
			label: 'Engineering',
			definition: 'Individual-contributor roles that build and operate software systems.',
		},

		'software-engineer': {
			label: 'Software Engineer',
			parent: 'engineering',
			synonyms: ['Software Developer', 'Programmer', 'SWE', 'Developer'],
		},
		'backend-engineer': {
			label: 'Backend Engineer',
			parent: 'software-engineer',
			synonyms: ['Back-End Engineer', 'Server-Side Engineer', 'Backend Developer'],
		},
		'frontend-engineer': {
			label: 'Frontend Engineer',
			parent: 'software-engineer',
			synonyms: ['Front-End Engineer', 'Frontend Developer', 'Client-Side Engineer'],
		},
		'full-stack-engineer': {
			label: 'Full-Stack Engineer',
			parent: 'software-engineer',
			synonyms: ['Fullstack Engineer', 'Full Stack Developer'],
		},
		'mobile-engineer': {
			label: 'Mobile Engineer',
			parent: 'software-engineer',
			synonyms: ['iOS Engineer', 'Android Engineer', 'Mobile Application Developer'],
		},
		'embedded-engineer': {
			label: 'Embedded Engineer',
			parent: 'software-engineer',
			synonyms: ['Firmware Engineer', 'Embedded Systems Engineer'],
		},
		'game-engineer': {
			label: 'Game Engineer',
			parent: 'software-engineer',
			synonyms: ['Gameplay Engineer', 'Game Developer'],
		},

		'platform-engineer': {
			label: 'Platform Engineer',
			parent: 'engineering',
			definition: 'Builds the internal systems other engineers deploy and run software on.',
			synonyms: ['Developer Platform Engineer'],
		},
		'infrastructure-engineer': {
			label: 'Infrastructure Engineer',
			parent: 'platform-engineer',
			synonyms: ['Cloud Engineer', 'Systems Engineer'],
		},
		'site-reliability-engineer': {
			label: 'Site Reliability Engineer',
			parent: 'platform-engineer',
			synonyms: ['SRE', 'Production Engineer'],
		},
		'devops-engineer': {
			label: 'DevOps Engineer',
			parent: 'platform-engineer',
			synonyms: ['DevOps', 'Build and Release Engineer', 'Release Engineer'],
		},

		'data-engineer': {
			label: 'Data Engineer',
			parent: 'engineering',
			synonyms: ['Analytics Engineer', 'ETL Engineer'],
		},
		'machine-learning-engineer': {
			label: 'Machine Learning Engineer',
			parent: 'engineering',
			synonyms: ['ML Engineer', 'MLOps Engineer', 'AI Engineer'],
		},
		'security-engineer': {
			label: 'Security Engineer',
			parent: 'engineering',
			synonyms: ['Application Security Engineer', 'AppSec Engineer', 'InfoSec Engineer'],
		},
		'qa-engineer': {
			label: 'QA Engineer',
			parent: 'engineering',
			synonyms: ['Quality Assurance Engineer', 'Test Engineer', 'SDET'],
		},
		'software-architect': {
			label: 'Software Architect',
			parent: 'engineering',
			synonyms: ['Principal Architect', 'Solutions Architect', 'Technical Architect'],
		},
		'developer-advocate': {
			label: 'Developer Advocate',
			parent: 'engineering',
			synonyms: ['Developer Relations', 'DevRel', 'Developer Evangelist'],
		},

		// ── Data and research ─────────────────────────────────────────────────
		data: {
			label: 'Data and Research',
			definition: 'Roles whose primary output is analysis, models, or research findings.',
		},
		'data-scientist': { label: 'Data Scientist', parent: 'data' },
		'data-analyst': {
			label: 'Data Analyst',
			parent: 'data',
			synonyms: ['Business Intelligence Analyst', 'BI Analyst'],
		},
		'research-scientist': {
			label: 'Research Scientist',
			parent: 'data',
			synonyms: ['Applied Scientist', 'Research Engineer'],
		},

		// ── Management ────────────────────────────────────────────────────────
		management: {
			label: 'Engineering Management',
			definition: 'Roles accountable for people, budget, or organizational outcomes.',
		},
		'engineering-manager': {
			label: 'Engineering Manager',
			parent: 'management',
			synonyms: ['Software Engineering Manager', 'EM', 'Development Manager'],
		},
		'director-of-engineering': {
			label: 'Director of Engineering',
			parent: 'management',
			synonyms: ['Engineering Director', 'Senior Engineering Manager'],
		},
		'vp-engineering': {
			label: 'VP of Engineering',
			parent: 'management',
			synonyms: ['Vice President of Engineering', 'Head of Engineering'],
		},
		cto: {
			label: 'Chief Technology Officer',
			parent: 'management',
			synonyms: ['CTO', 'Chief Technical Officer'],
		},

		// ── Product and design ────────────────────────────────────────────────
		'product-and-design': {
			label: 'Product and Design',
			definition: 'Roles that decide what gets built and how it behaves.',
		},
		'product-manager': {
			label: 'Product Manager',
			parent: 'product-and-design',
			synonyms: ['PM', 'Technical Product Manager'],
		},
		'technical-program-manager': {
			label: 'Technical Program Manager',
			parent: 'product-and-design',
			synonyms: ['TPM', 'Program Manager', 'Project Manager'],
		},
		'product-designer': {
			label: 'Product Designer',
			parent: 'product-and-design',
			synonyms: ['UI Designer', 'UX Designer', 'Interaction Designer'],
		},
		'ux-researcher': {
			label: 'UX Researcher',
			parent: 'product-and-design',
			synonyms: ['User Researcher', 'User Experience Researcher'],
		},

		// ── IT operations ─────────────────────────────────────────────────────
		'it-operations': {
			label: 'IT Operations',
			definition: 'Roles that run corporate systems and support their users.',
		},
		'systems-administrator': {
			label: 'Systems Administrator',
			parent: 'it-operations',
			synonyms: ['Sysadmin', 'IT Administrator'],
		},
		'network-engineer': {
			label: 'Network Engineer',
			parent: 'it-operations',
			synonyms: ['Network Architect'],
		},
		'database-administrator': {
			label: 'Database Administrator',
			parent: 'it-operations',
			synonyms: ['DBA'],
		},
		'support-engineer': {
			label: 'Support Engineer',
			parent: 'it-operations',
			synonyms: ['Technical Support Engineer', 'Solutions Engineer', 'Sales Engineer'],
		},
	},
	{
		title: 'Role',
		description: 'What a person does, independent of seniority.',
	},
);
