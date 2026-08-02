import { vocabulary } from '../core/vocabulary.js';

/**
 * The vertical a company operates in.
 *
 * These are the verticals people actually name on resumes and in job postings —
 * "fintech", "devtools" — rather than a formal industry classification, which
 * reads nothing like how anyone describes where they work.
 */
export const industry = vocabulary(
	'industry',
	{
		// ── Technology ────────────────────────────────────────────────────────
		technology: {
			label: 'Technology',
			definition:
				'Companies whose product is software, hardware, or technical infrastructure.',
		},
		saas: {
			label: 'SaaS',
			parent: 'technology',
			synonyms: ['Software as a Service', 'B2B Software', 'Enterprise Software'],
		},
		devtools: {
			label: 'Developer Tools',
			parent: 'technology',
			synonyms: ['Developer Tooling', 'DevTools', 'Developer Platform'],
		},
		'cloud-infrastructure': {
			label: 'Cloud Infrastructure',
			parent: 'technology',
			synonyms: ['Cloud Computing', 'Hosting', 'IaaS', 'PaaS'],
		},
		cybersecurity: {
			label: 'Cybersecurity',
			parent: 'technology',
			synonyms: ['Security', 'InfoSec', 'Information Security'],
		},
		'artificial-intelligence': {
			label: 'Artificial Intelligence',
			parent: 'technology',
			synonyms: ['AI', 'Machine Learning', 'ML'],
		},
		'data-infrastructure': {
			label: 'Data Infrastructure',
			parent: 'technology',
			synonyms: ['Data Platform', 'Analytics Platform', 'Big Data'],
		},
		hardware: {
			label: 'Hardware and Semiconductors',
			parent: 'technology',
			synonyms: ['Semiconductors', 'Consumer Electronics', 'Computer Hardware'],
		},
		telecommunications: {
			label: 'Telecommunications',
			parent: 'technology',
			synonyms: ['Telecom', 'Networking'],
		},

		// ── Financial services ────────────────────────────────────────────────
		'financial-services': {
			label: 'Financial Services',
		},
		fintech: {
			label: 'Fintech',
			parent: 'financial-services',
			synonyms: ['Financial Technology', 'Payments'],
		},
		banking: {
			label: 'Banking',
			parent: 'financial-services',
			synonyms: ['Retail Banking', 'Investment Banking'],
		},
		insurance: {
			label: 'Insurance',
			parent: 'financial-services',
			synonyms: ['Insurtech'],
		},
		crypto: {
			label: 'Crypto and Blockchain',
			parent: 'financial-services',
			synonyms: ['Cryptocurrency', 'Blockchain', 'Web3', 'DeFi'],
		},

		// ── Health and life sciences ──────────────────────────────────────────
		'health-and-life-sciences': {
			label: 'Health and Life Sciences',
		},
		healthtech: {
			label: 'Health Technology',
			parent: 'health-and-life-sciences',
			synonyms: ['Healthtech', 'Digital Health', 'Health IT'],
		},
		biotech: {
			label: 'Biotechnology',
			parent: 'health-and-life-sciences',
			synonyms: ['Biotech', 'Genomics', 'Pharmaceuticals'],
		},
		'medical-devices': {
			label: 'Medical Devices',
			parent: 'health-and-life-sciences',
		},

		// ── Consumer and commerce ─────────────────────────────────────────────
		'consumer-and-commerce': {
			label: 'Consumer and Commerce',
		},
		ecommerce: {
			label: 'E-Commerce',
			parent: 'consumer-and-commerce',
			synonyms: ['Online Retail', 'Marketplace', 'Retail Tech'],
		},
		gaming: {
			label: 'Gaming',
			parent: 'consumer-and-commerce',
			synonyms: ['Video Games', 'Interactive Entertainment'],
		},
		'media-and-streaming': {
			label: 'Media and Streaming',
			parent: 'consumer-and-commerce',
			synonyms: ['Media', 'Entertainment', 'Streaming', 'Publishing'],
		},
		'social-media': {
			label: 'Social Media',
			parent: 'consumer-and-commerce',
			synonyms: ['Social Networking', 'Creator Economy'],
		},
		'travel-and-hospitality': {
			label: 'Travel and Hospitality',
			parent: 'consumer-and-commerce',
			synonyms: ['Travel Tech', 'Hospitality'],
		},
		adtech: {
			label: 'Advertising Technology',
			parent: 'consumer-and-commerce',
			synonyms: ['AdTech', 'Marketing Technology', 'MarTech', 'Advertising'],
		},

		// ── Industry and infrastructure ───────────────────────────────────────
		'industry-and-infrastructure': {
			label: 'Industry and Infrastructure',
		},
		manufacturing: {
			label: 'Manufacturing',
			parent: 'industry-and-infrastructure',
			synonyms: ['Industrial', 'Industry 4.0'],
		},
		'logistics-and-supply-chain': {
			label: 'Logistics and Supply Chain',
			parent: 'industry-and-infrastructure',
			synonyms: ['Logistics', 'Supply Chain', 'Freight', 'Transportation'],
		},
		'energy-and-climate': {
			label: 'Energy and Climate',
			parent: 'industry-and-infrastructure',
			synonyms: ['Energy', 'Cleantech', 'Climate Tech', 'Utilities'],
		},
		'aerospace-and-defense': {
			label: 'Aerospace and Defense',
			parent: 'industry-and-infrastructure',
			synonyms: ['Aerospace', 'Defense', 'Space'],
		},
		automotive: {
			label: 'Automotive',
			parent: 'industry-and-infrastructure',
			synonyms: ['Mobility', 'Autonomous Vehicles'],
		},
		'real-estate-and-construction': {
			label: 'Real Estate and Construction',
			parent: 'industry-and-infrastructure',
			synonyms: ['PropTech', 'Real Estate', 'Construction', 'ConTech'],
		},

		// ── Public and social ─────────────────────────────────────────────────
		'public-and-social': {
			label: 'Public and Social Sector',
		},
		government: {
			label: 'Government',
			parent: 'public-and-social',
			synonyms: ['Public Sector', 'GovTech', 'Civic Technology'],
		},
		education: {
			label: 'Education',
			parent: 'public-and-social',
			synonyms: ['EdTech', 'Education Technology', 'Academia', 'Higher Education'],
		},
		nonprofit: {
			label: 'Nonprofit',
			parent: 'public-and-social',
			synonyms: ['Non-Profit', 'NGO', 'Charity', 'Social Impact'],
		},
		'legal-tech': {
			label: 'Legal Technology',
			parent: 'public-and-social',
			synonyms: ['LegalTech', 'Legal Services', 'RegTech', 'Compliance'],
		},

		// ── Professional services ─────────────────────────────────────────────
		'professional-services': {
			label: 'Professional Services',
		},
		consulting: {
			label: 'Consulting',
			parent: 'professional-services',
			synonyms: ['Management Consulting', 'Technology Consulting', 'Systems Integrator'],
		},
		agency: {
			label: 'Agency',
			parent: 'professional-services',
			synonyms: ['Digital Agency', 'Design Agency', 'Creative Agency'],
		},
		staffing: {
			label: 'Staffing and Recruiting',
			parent: 'professional-services',
			synonyms: ['Recruiting', 'Talent', 'HR Tech', 'Staffing'],
		},
	},
	{
		title: 'Industry',
		description: 'Vertical a company operates in.',
	},
);
