import { describe, expect, it } from 'vitest';

import type { Vocabulary } from '../core/vocabulary.js';
import { companyStage, engagementType, workArrangement } from './company.js';
import { industry } from './industry.js';
import { role } from './role.js';
import { compareSeniority, meetsSeniority, seniority } from './seniority.js';
import { technologyCategory } from './technology-category.generated.js';
import { categorizeTechnology, normalizeTechnologies, technology } from './technology.js';

// Typed as the string-keyed form so the shared assertions below can call
// methods across vocabularies with different key unions.
const all: Vocabulary[] = [
	role,
	seniority,
	industry,
	companyStage,
	engagementType,
	workArrangement,
	technologyCategory,
];

describe('every vocabulary', () => {
	it.each(all.map((v) => [v.name, v] as const))('%s is internally consistent', (_name, v) => {
		// Construction already validates parents and rejects cycles, so reaching
		// this point covers those. What is left is that every concept round-trips
		// through its own normalizer.
		for (const key of v.keys) {
			expect(v.normalize(key)).toBeDefined();
			expect(v.has(key)).toBe(true);
		}

		expect(v.roots().length).toBeGreaterThan(0);
		expect(v.zod.options.length).toBe(v.keys.length);
	});
});

describe('role', () => {
	it('matches common resume phrasings', () => {
		expect(role.normalize('SWE')).toBe('software-engineer');
		expect(role.normalize('Back-End Engineer')).toBe('backend-engineer');
		expect(role.normalize('SRE')).toBe('site-reliability-engineer');
		expect(role.normalize('DevOps')).toBe('devops-engineer');
		expect(role.normalize('ML Engineer')).toBe('machine-learning-engineer');
	});

	it('places specializations under software-engineer', () => {
		expect(role.contains('software-engineer', 'backend-engineer')).toBe(true);
		expect(role.contains('engineering', 'mobile-engineer')).toBe(true);
	});

	it('expands a broad role to every specialization beneath it', () => {
		const expanded = role.expand('platform-engineer');

		expect(expanded).toContain('site-reliability-engineer');
		expect(expanded).toContain('devops-engineer');
		expect(expanded).not.toContain('backend-engineer');
	});

	it('keeps management separate from individual contribution', () => {
		expect(role.contains('engineering', 'engineering-manager')).toBe(false);
	});
});

describe('seniority', () => {
	it('orders the IC ladder', () => {
		expect(compareSeniority('junior', 'senior')).toBeLessThan(0);
		expect(compareSeniority('principal', 'staff')).toBeGreaterThan(0);
	});

	it('treats staff and manager as peers across tracks', () => {
		expect(compareSeniority('staff', 'manager')).toBe(0);
	});

	it('answers whether a candidate clears a required level', () => {
		expect(meetsSeniority('staff', 'senior')).toBe(true);
		expect(meetsSeniority('mid', 'senior')).toBe(false);
	});

	it('matches level shorthand', () => {
		expect(seniority.normalize('Sr')).toBe('senior');
		expect(seniority.normalize('L5')).toBe('senior');
		expect(seniority.normalize('Tech Lead')).toBe('staff');
		expect(seniority.normalize('VP')).toBe('vp');
	});
});

describe('industry', () => {
	it('matches vertical shorthand', () => {
		expect(industry.normalize('Financial Technology')).toBe('fintech');
		expect(industry.normalize('EdTech')).toBe('education');
		expect(industry.normalize('Web3')).toBe('crypto');
	});
});

describe('company and engagement', () => {
	it('matches the existing LocationType enum spellings', () => {
		expect(workArrangement.normalize('on_site')).toBe('on-site');
		expect(workArrangement.normalize('remote')).toBe('remote');
		expect(workArrangement.normalize('hybrid')).toBe('hybrid');
	});

	it('separates engagement type from company stage', () => {
		expect(engagementType.normalize('Contractor')).toBe('contract');
		expect(companyStage.normalize('Series A')).toBe('series-a');
		// "consulting" is an engagement, not a stage — the old free-text
		// `contexts` tag group conflated the two.
		expect(engagementType.normalize('Consulting')).toBe('freelance');
		expect(companyStage.normalize('Consulting')).toBeUndefined();
	});

	it('matches open-source and personal work', () => {
		expect(engagementType.normalize('OSS')).toBe('open-source');
		expect(engagementType.normalize('Side Project')).toBe('personal');
	});
});

describe('technology lookup', () => {
	it('loads the full set', () => {
		expect(technology.size).toBeGreaterThan(8000);
	});

	it('matches names verbatim', () => {
		expect(technology.resolve('Kubernetes')?.name).toBe('Kubernetes');
	});

	it('matches punctuation and case variants without curated synonyms', () => {
		expect(technology.resolve('react.js')?.name).toBe('React');
		expect(technology.resolve('REACTJS')?.name).toBe('React');
		expect(technology.resolve('postgresql')?.name).toBe('PostgreSQL');
	});

	it('matches curated shorthand the source data does not carry', () => {
		expect(technology.resolve('k8s')?.name).toBe('Kubernetes');
		expect(technology.resolve('AWS')?.name).toBe('Amazon Web Services AWS software');
		expect(technology.resolve('Terraform')?.name).toBe('IBM Terraform');
		expect(technology.resolve('Postgres')?.name).toBe('PostgreSQL');
	});

	it('reaches a suffixless canonical name past a js suffix', () => {
		expect(technology.resolve('React.js')?.name).toBe('React');
		expect(technology.resolve('React JS')?.name).toBe('React');
	});

	it('prefers a real ...JS product over the suffix fallback', () => {
		expect(technology.resolve('PhantomJS')?.name).toBe('PhantomJS');
		expect(technology.resolve('Vue.js')?.name).toBe('Vue.js');
		expect(technology.resolve('vuejs')?.name).toBe('Vue.js');
		expect(technology.resolve('Ext JS')?.name).toBe('Ext JS');
	});

	it('keeps C, C++, and C# distinct', () => {
		expect(technology.resolve('C++')?.name).toBe('C++');
		expect(technology.resolve('C#')?.name).toBe('C#');
	});

	it('categorizes into the category tree with a top-level bucket', () => {
		const react = categorizeTechnology('React');

		expect(react?.category).toBe('web-platform-development-software');
		expect(react?.bucket).toBe('software-development');
		expect(react?.hot).toBe(true);
	});

	it('separates matched technologies from unknown ones', () => {
		const result = normalizeTechnologies(['react.js', 'React', 'k8s', 'Frobnicator 9000']);

		expect(result.resolved).toEqual(['React', 'Kubernetes']);
		expect(result.unresolved).toEqual(['Frobnicator 9000']);
	});

	it('files every technology under a real category concept', () => {
		for (const record of technology.all()) {
			expect(technologyCategory.has(record.category)).toBe(true);
		}
	});
});
