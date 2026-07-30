import { vocabulary } from '../core/vocabulary.js';

/**
 * How far along a company is.
 *
 * Kept separate from headcount: a 200-person Series B and a 200-person family
 * business are the same size and nothing alike to work at.
 */
export const companyStage = vocabulary(
	'company-stage',
	{
		startup: {
			label: 'Startup',
			definition: 'Venture-backed and still searching for or scaling a repeatable model.',
		},
		'pre-seed': {
			label: 'Pre-Seed',
			parent: 'startup',
			synonyms: ['Founding Team', 'Idea Stage'],
		},
		seed: { label: 'Seed', parent: 'startup', synonyms: ['Seed Stage'] },
		'series-a': { label: 'Series A', parent: 'startup' },
		'series-b': { label: 'Series B', parent: 'startup' },
		'growth-stage': {
			label: 'Growth Stage',
			parent: 'startup',
			synonyms: ['Series C', 'Series D', 'Late Stage', 'Scale-Up'],
		},

		established: {
			label: 'Established',
			definition: 'Past the venture phase — public, profitable, or long-lived.',
		},
		public: {
			label: 'Public Company',
			parent: 'established',
			synonyms: ['Publicly Traded', 'Post-IPO'],
		},
		enterprise: {
			label: 'Enterprise',
			parent: 'established',
			synonyms: ['Large Enterprise', 'Fortune 500', 'Multinational'],
		},
		'small-business': {
			label: 'Small Business',
			parent: 'established',
			synonyms: ['SMB', 'Family Business', 'Bootstrapped'],
		},

		'non-commercial': {
			label: 'Non-Commercial',
			definition: 'Organizations not structured to return capital to investors.',
		},
		'public-sector': {
			label: 'Public Sector',
			parent: 'non-commercial',
			synonyms: ['Government Agency', 'Municipal', 'Federal'],
		},
		'nonprofit-org': {
			label: 'Nonprofit Organization',
			parent: 'non-commercial',
			synonyms: ['Nonprofit', 'NGO', 'Foundation'],
		},
		academic: {
			label: 'Academic Institution',
			parent: 'non-commercial',
			synonyms: ['University', 'Research Institute', 'College'],
		},
	},
	{
		title: 'Company Stage',
		description: 'Maturity and funding stage of an organization.',
	},
);

/**
 * The shape of the working relationship.
 *
 * This is what `Fact.tags` currently gestures at with its free-text `contexts`
 * group (enterprise, startup, consulting, …). Those values conflate three
 * different things — stage, engagement, and industry — which is why they are
 * three vocabularies here.
 */
export const engagementType = vocabulary(
	'engagement-type',
	{
		employment: { label: 'Employment', definition: 'Directly employed by the organization.' },
		'full-time': { label: 'Full-Time', parent: 'employment', synonyms: ['FTE', 'Permanent'] },
		'part-time': { label: 'Part-Time', parent: 'employment' },
		internship: { label: 'Internship', parent: 'employment', synonyms: ['Intern', 'Co-op'] },
		apprenticeship: { label: 'Apprenticeship', parent: 'employment' },

		independent: {
			label: 'Independent',
			definition: 'Engaged as an external party rather than an employee.',
		},
		contract: {
			label: 'Contract',
			parent: 'independent',
			synonyms: ['Contractor', 'Contract-to-Hire', 'B2B'],
		},
		freelance: {
			label: 'Freelance',
			parent: 'independent',
			synonyms: ['Self-Employed', 'Consultant', 'Consulting'],
		},
		founder: {
			label: 'Founder',
			parent: 'independent',
			synonyms: ['Co-Founder', 'Entrepreneur'],
		},

		unpaid: { label: 'Unpaid', definition: 'Work performed without compensation.' },
		volunteer: {
			label: 'Volunteer',
			parent: 'unpaid',
			synonyms: ['Volunteering', 'Pro Bono'],
		},
		'open-source': {
			label: 'Open Source',
			parent: 'unpaid',
			synonyms: ['OSS', 'Open-Source Contribution', 'Maintainer'],
		},
		personal: {
			label: 'Personal Project',
			parent: 'unpaid',
			synonyms: ['Side Project', 'Hobby Project'],
		},
	},
	{
		title: 'Engagement Type',
		description: 'Nature of the working relationship between a person and an organization.',
	},
);

/**
 * Where the work physically happens.
 *
 * Mirrors the existing `LocationType` Prisma enum. The underscore spelling is
 * listed as a synonym so stored `on_site` values resolve without a migration.
 */
export const workArrangement = vocabulary(
	'work-arrangement',
	{
		'on-site': {
			label: 'On-Site',
			synonyms: ['Onsite', 'In-Office', 'In Person', 'on_site'],
		},
		hybrid: { label: 'Hybrid', synonyms: ['Flexible', 'Partially Remote'] },
		remote: { label: 'Remote', synonyms: ['Fully Remote', 'Distributed', 'Work From Home'] },
	},
	{
		title: 'Work Arrangement',
		description: 'Where work is performed, mirroring the LocationType enum.',
	},
);
