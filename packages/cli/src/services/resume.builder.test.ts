import { beforeEach, describe } from '@std/testing/bdd';
import { Test, TestingModule } from '@nestjs/testing';
import { spy } from '@std/testing/mock';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { ResumeBuilder } from './resume.builder.ts';
import { LookupService } from './lookup.service.ts';
import { NotionClient } from '../tokens.ts';

describe('ResumeBuilder', () => {
	let module: TestingModule;
	let resumeBuilder: ResumeBuilder;

	const mockNotionClient = {
		databases: {
			query: () => Promise.resolve({ results: [] }),
		},
		pages: {
			retrieve: () => Promise.resolve({}),
		},
	};

	const mockLookupService = {
		getId: () => 'mock-database-id',
	};

	const mockResumePageResponse: Partial<PageObjectResponse> = {
		object: 'page',
		id: 'mock-resume-id',
		properties: {
			Name: {
				type: 'title',
				title: [{ plain_text: 'Test Resume' }],
			} as any,
			Title: {
				type: 'rich_text',
				rich_text: [{ plain_text: 'Software Engineer' }],
			} as any,
			Summary: {
				type: 'rich_text',
				rich_text: [{ plain_text: 'A summary' }],
			} as any,
			Location: {
				type: 'rich_text',
				rich_text: [{ plain_text: 'New York' }],
			} as any,
			Phone: { type: 'phone_number', phone_number: '555-1234' } as any,
			Email: { type: 'email', email: 'test@example.com' } as any,
			'LinkedIn Profile': {
				type: 'url',
				url: 'https://linkedin.com/in/test',
			} as any,
			'GitHub Profile': {
				type: 'url',
				url: 'https://github.com/test',
			} as any,
			'Work History': { type: 'relation', relation: [] } as any,
			Education: { type: 'relation', relation: [] } as any,
			Skills: { type: 'relation', relation: [] } as any,
			Projects: { type: 'relation', relation: [] } as any,
		},
	};

	beforeEach(async () => {
		module = await Test.createTestingModule({
			providers: [
				ResumeBuilder,
				{ provide: LookupService, useValue: mockLookupService },
				{ provide: NotionClient, useValue: mockNotionClient },
			],
		}).compile();

		resumeBuilder = module.get<ResumeBuilder>(ResumeBuilder);

		// Mock the private findResumeById method
		(resumeBuilder as any).findResumeById = () =>
			Promise.resolve(mockResumePageResponse as PageObjectResponse);
	});

	describe('build()', () => {});
});
